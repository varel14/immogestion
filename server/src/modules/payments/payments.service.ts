import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { generateUniqueReference } from '../../utils/reference-generic.js';
import { money } from '../../utils/serializers.js';
import { logAudit } from '../../utils/audit.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import type { CreatePaymentInput, ListPaymentsQuery } from './payments.validators.js';

const paymentInclude = {
  client: { select: { id: true, firstName: true, lastName: true } },
  sale: { select: { id: true, reference: true } },
  invoice: {
    select: {
      id: true, dueDate: true,
      contract: { select: { id: true, reference: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

function toPlain(payment: Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>) {
  const { sale, invoice, ...rest } = payment;
  return {
    ...rest,
    amount: money(payment.amount),
    sale: sale ?? null,
    invoice: invoice
      ? { id: invoice.id, dueDate: invoice.dueDate, contract: invoice.contract }
      : null,
  };
}

export async function listPayments(query: ListPaymentsQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.PaymentWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.paymentType ? { paymentType: query.paymentType } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.saleId ? { saleId: query.saleId } : {}),
    ...(query.contractId ? { contractId: query.contractId } : {}),
    ...(query.from || query.to
      ? { paymentDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { reference: { contains: query.search, mode: 'insensitive' } },
            { transactionReference: { contains: query.search, mode: 'insensitive' } },
            { client: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { client: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: [{ paymentDate: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: paymentInclude,
    }),
  ]);

  return { data: payments.map(toPlain), pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

export async function getPaymentById(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: paymentInclude });
  if (!payment) throw notFound('Paiement introuvable.');
  return toPlain(payment);
}

/** Enregistrement manuel d'un paiement générique (caution, autres frais). */
export async function createManualPayment(req: AuthenticatedRequest, input: CreatePaymentInput) {
  const client = await prisma.client.findUnique({ where: { id: input.clientId }, select: { id: true } });
  if (!client) throw badRequest('Le client sélectionné est introuvable.');

  const reference = await generateUniqueReference('PAY', (ref) =>
    prisma.payment.findUnique({ where: { reference: ref }, select: { id: true } }).then((r) => !!r),
  );

  const payment = await prisma.payment.create({
    data: {
      reference,
      clientId: input.clientId,
      amount: input.amount,
      paymentType: input.paymentType,
      paymentMethod: input.paymentMethod,
      paymentDate: new Date(input.paymentDate),
      status: 'CONFIRMED',
      transactionReference: input.transactionReference,
      notes: input.notes,
    },
    include: paymentInclude,
  });

  await logAudit(prisma, req, {
    action: 'CREATE',
    entityType: 'Payment',
    entityId: payment.id,
    details: `Paiement manuel ${reference} de ${input.amount} FCFA (${input.paymentType})`,
  });
  return toPlain(payment);
}

/**
 * Annulation d'un paiement : les échéances et ventes liées sont recalculées.
 * Les enregistrements sont conservés (statut CANCELLED), jamais supprimés.
 */
export async function cancelPayment(req: AuthenticatedRequest, id: string, reason?: string | null) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: { select: { id: true, expectedAmount: true, paidAmount: true, status: true, receipt: { select: { id: true, reference: true } } } },
      sale: { select: { id: true, salePrice: true, propertyId: true } },
    },
  });
  if (!payment) throw notFound('Paiement introuvable.');
  if (payment.status === 'CANCELLED') throw badRequest('Ce paiement est déjà annulé.');

  if (payment.invoice?.receipt) {
    throw badRequest(
      `Impossible d'annuler : une quittance (${payment.invoice.receipt.reference}) a été émise pour cette échéance.`,
    );
  }

  const paidByOthers = await prisma.payment.aggregate({
    where: { status: 'CONFIRMED', NOT: { id: payment.id }, ...(payment.invoiceId ? { invoiceId: payment.invoiceId } : {}), ...(payment.saleId ? { saleId: payment.saleId } : {}) },
    _sum: { amount: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id },
      data: { status: 'CANCELLED', notes: [payment.notes, reason ? `Annulé : ${reason}` : 'Annulé'].filter(Boolean).join(' — ') || null },
    });

    if (payment.invoice) {
      const paidAmount = money(paidByOthers._sum.amount) ?? 0;
      await tx.rentInvoice.update({
        where: { id: payment.invoice.id },
        data: {
          paidAmount,
          status: paidAmount === 0 ? 'PENDING' : 'PARTIALLY_PAID',
        },
      });
    }
    // Aucun recalcul de statut de bien nécessaire : un paiement n'affecte
    // jamais directement le statut opérationnel du bien.
  });

  await logAudit(prisma, req, {
    action: 'CANCEL',
    entityType: 'Payment',
    entityId: id,
    details: reason ? `Paiement ${payment.reference} annulé : ${reason}` : `Paiement ${payment.reference} annulé`,
  });
  return getPaymentById(id);
}
