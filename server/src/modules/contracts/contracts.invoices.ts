import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { generateUniqueReference } from '../../utils/reference-generic.js';
import { money } from '../../utils/serializers.js';
import { logAudit } from '../../utils/audit.js';
import { AGENCY_INFO } from '../../config/constants.js';
import { buildPdf } from '../../utils/pdf.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import type { ListInvoicesQuery } from './contracts.validators.js';

const invoiceInclude = {
  contract: {
    select: {
      id: true, reference: true, monthlyRent: true,
      tenant: { select: { id: true, firstName: true, lastName: true } },
      property: { select: { id: true, reference: true, title: true, city: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.RentInvoiceInclude;

function toPlain(invoice: Prisma.RentInvoiceGetPayload<{ include: typeof invoiceInclude }>) {
  const { contract, ...rest } = invoice;
  return {
    ...rest,
    expectedAmount: money(invoice.expectedAmount),
    paidAmount: money(invoice.paidAmount),
    remainingAmount: Number(invoice.expectedAmount) - Number(invoice.paidAmount),
    contract: { ...contract, monthlyRent: money(contract.monthlyRent) },
  };
}

/** Marque en retard les échéances non soldées dont la date est dépassée. */
async function refreshOverdue(): Promise<void> {
  await prisma.rentInvoice.updateMany({
    where: { dueDate: { lt: new Date() }, status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
    data: { status: 'OVERDUE' },
  });
}

export async function listInvoices(query: ListInvoicesQuery) {
  await refreshOverdue();

  const pagination = parsePagination(query);
  const where: Prisma.RentInvoiceWhereInput = {
    ...(query.contractId ? { contractId: query.contractId } : {}),
    ...(query.ownerId ? { contract: { ownerId: query.ownerId } } : {}),
    ...(query.tenantId ? { contract: { tenantId: query.tenantId } } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, invoices] = await Promise.all([
    prisma.rentInvoice.count({ where }),
    prisma.rentInvoice.findMany({
      where,
      orderBy: [{ dueDate: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: {
        ...invoiceInclude,
        receipt: { select: { id: true, reference: true } },
      },
    }),
  ]);

  return { data: invoices.map(toPlain), pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

export async function getInvoiceById(id: string) {
  await refreshOverdue();
  const invoice = await prisma.rentInvoice.findUnique({
    where: { id },
    include: {
      ...invoiceInclude,
      payments: { orderBy: { paymentDate: 'desc' } },
      receipt: { select: { id: true, reference: true, issuedAt: true } },
    },
  });
  if (!invoice) throw notFound('Échéance introuvable.');
  return {
    ...toPlain(invoice),
    payments: invoice.payments.map((payment) => ({ ...payment, amount: money(payment.amount) })),
  };
}

/**
 * Enregistrement d'un paiement de loyer (total ou partiel).
 * Le paiement met à jour l'état de l'échéance ; le dépassement du montant
 * attendu est bloqué.
 */
export async function payInvoice(
  req: AuthenticatedRequest,
  invoiceId: string,
  input: { amount: number; paymentMethod: string; paymentDate?: string; transactionReference?: string | null; notes?: string | null },
) {
  await refreshOverdue();
  const invoice = await prisma.rentInvoice.findUnique({
    where: { id: invoiceId },
    include: { contract: { select: { id: true, tenantId: true, reference: true } } },
  });
  if (!invoice) throw notFound('Échéance introuvable.');
  if (invoice.status === 'PAID') {
    throw badRequest('Cette échéance est déjà entièrement payée.');
  }

  const remaining = Number(invoice.expectedAmount) - Number(invoice.paidAmount);
  if (input.amount > remaining) {
    throw badRequest(
      `Le paiement (${input.amount} FCFA) dépasse le montant restant dû (${remaining} FCFA). Enregistrez un paiement partiel ou soldez exactement l'échéance.`,
    );
  }

  const reference = await generateUniqueReference('PAY', (ref) =>
    prisma.payment.findUnique({ where: { reference: ref }, select: { id: true } }).then((r) => !!r),
  );

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        reference,
        clientId: invoice.contract.tenantId,
        amount: input.amount,
        paymentType: 'RENT',
        paymentMethod: input.paymentMethod as never,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        status: 'CONFIRMED',
        transactionReference: input.transactionReference,
        notes: input.notes,
        invoiceId: invoice.id,
        contractId: invoice.contract.id,
      },
    });

    const paidAmount = Number(invoice.paidAmount) + input.amount;
    await tx.rentInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount,
        status: paidAmount >= Number(invoice.expectedAmount) ? 'PAID' : 'PARTIALLY_PAID',
      },
    });
    return created;
  });

  await logAudit(prisma, req, {
    action: 'PAY',
    entityType: 'RentInvoice',
    entityId: invoiceId,
    details: `Paiement de ${input.amount} FCFA sur l'échéance du bail ${invoice.contract.reference} (${reference})`,
  });
  return { payment: { ...payment, amount: money(payment.amount) }, invoice: await getInvoiceById(invoiceId) };
}

/** Génère la quittance d'une échéance entièrement réglée. */
export async function createReceipt(req: AuthenticatedRequest, invoiceId: string) {
  await refreshOverdue();
  const invoice = await prisma.rentInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      receipt: { select: { id: true, reference: true } },
      contract: {
        include: {
          tenant: { select: { firstName: true, lastName: true } },
          owner: { select: { firstName: true, lastName: true } },
          property: { select: { reference: true, title: true, city: true } },
        },
      },
      payments: { where: { status: 'CONFIRMED' }, orderBy: { paymentDate: 'asc' } },
    },
  });
  if (!invoice) throw notFound('Échéance introuvable.');
  if (invoice.status !== 'PAID') {
    throw badRequest('La quittance ne peut être générée que pour une échéance entièrement payée.');
  }
  if (invoice.receipt) {
    throw badRequest(`Une quittance a déjà été émise pour cette échéance (${invoice.receipt.reference}).`);
  }

  const reference = await generateUniqueReference('QUIT', (ref) =>
    prisma.receipt.findUnique({ where: { reference: ref }, select: { id: true } }).then((r) => !!r),
  );

  const periodLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(invoice.dueDate);
  const lastPayment = invoice.payments[invoice.payments.length - 1];

  const receipt = await prisma.receipt.create({
    data: {
      reference,
      invoiceId: invoice.id,
      periodLabel,
      amount: invoice.paidAmount,
      paymentDate: lastPayment?.paymentDate ?? new Date(),
    },
  });

  await logAudit(prisma, req, {
    action: 'CREATE',
    entityType: 'Receipt',
    entityId: receipt.id,
    details: `Quittance ${reference} émise (${periodLabel})`,
  });
  return { ...receipt, amount: money(receipt.amount) };
}

export async function listReceipts(query: { contractId?: string; page?: number; pageSize?: number }) {
  const pagination = parsePagination(query);
  const where: Prisma.ReceiptWhereInput = {
    ...(query.contractId ? { invoice: { contractId: query.contractId } } : {}),
  };

  const [total, receipts] = await Promise.all([
    prisma.receipt.count({ where }),
    prisma.receipt.findMany({
      where,
      orderBy: [{ issuedAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: {
        invoice: {
          include: {
            contract: {
              select: {
                reference: true,
                tenant: { select: { firstName: true, lastName: true } },
                owner: { select: { firstName: true, lastName: true } },
                property: { select: { title: true, city: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    data: receipts.map((receipt) => ({
      ...receipt,
      amount: money(receipt.amount),
    })),
    pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize),
  };
}

/** Construit le PDF de la quittance (téléchargement). */
export async function buildReceiptPdf(receiptId: string): Promise<{ fileName: string; pdf: Buffer }> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      invoice: {
        include: {
          contract: {
            include: {
              tenant: true,
              owner: true,
              property: { select: { reference: true, title: true, address: true, city: true } },
            },
          },
        },
      },
    },
  });
  if (!receipt) throw notFound('Quittance introuvable.');

  const invoice = receipt.invoice;
  const contract = invoice.contract;
  const fmt = (date: Date) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date);
  const fmtMoney = (value: Prisma.Decimal | number) =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value))} FCFA`;

  const pdf = buildPdf(`Quittance de loyer ${receipt.reference}`, [
    `${AGENCY_INFO.name} — ${AGENCY_INFO.address}, ${AGENCY_INFO.city}`,
    `Telephone : ${AGENCY_INFO.phone} — ${AGENCY_INFO.email}`,
    '',
    `Quittance numero : ${receipt.reference}`,
    `Emise le : ${fmt(receipt.issuedAt)}`,
    '',
    `Locataire : ${contract.tenant.firstName} ${contract.tenant.lastName}`,
    `Proprietaire : ${contract.owner.firstName} ${contract.owner.lastName}`,
    `Bien loue : ${contract.property.title} (${contract.property.reference})`,
    contract.property.address ? `Adresse : ${contract.property.address}, ${contract.property.city}` : `Ville : ${contract.property.city}`,
    `Bail : ${contract.reference}`,
    '',
    `Periode concernee : ${receipt.periodLabel}`,
    `Montant regle : ${fmtMoney(receipt.amount)}`,
    `Date du paiement : ${fmt(receipt.paymentDate)}`,
    `Echeance : ${fmt(invoice.dueDate)}`,
    '',
    `Le locataire est quitte pour la periode citee ci-dessus.`,
    `Document genere par ${AGENCY_INFO.name}.`,
  ]);

  return { fileName: `quittance-${receipt.reference}.pdf`, pdf };
}
