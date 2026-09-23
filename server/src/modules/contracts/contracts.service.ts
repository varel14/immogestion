import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { generateUniqueReference } from '../../utils/reference-generic.js';
import { money } from '../../utils/serializers.js';
import { logAudit } from '../../utils/audit.js';
import { recomputePropertyStatus } from '../../utils/property-status.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import type { CreateContractInput, ListContractsQuery } from './contracts.validators.js';

const contractInclude = {
  property: { select: { id: true, reference: true, title: true, city: true, status: true } },
  tenant: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
} satisfies Prisma.RentalContractInclude;

function toPlain(contract: Prisma.RentalContractGetPayload<{ include: typeof contractInclude }>) {
  return {
    ...contract,
    monthlyRent: money(contract.monthlyRent),
    depositAmount: money(contract.depositAmount),
  };
}

/** Génère les échéances mensuelles entre deux dates (jour d'échéance du contrat). */
export async function generateInvoices(
  tx: Prisma.TransactionClient,
  contract: { id: string; startDate: Date; endDate: Date; monthlyRent: Prisma.Decimal; paymentDay: number },
  from: Date,
): Promise<number> {
  const invoices: { contractId: string; dueDate: Date; expectedAmount: Prisma.Decimal }[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(contract.endDate.getUTCFullYear(), contract.endDate.getUTCMonth(), 1));

  while (cursor <= end) {
    const dueDate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), contract.paymentDay, 12));
    // L'échéance du mois de début de bail est due seulement si le bail démarre
    // avant le jour d'échéance ; sinon elle démarre le mois suivant.
    if (dueDate >= contract.startDate && dueDate <= contract.endDate) {
      invoices.push({ contractId: contract.id, dueDate, expectedAmount: contract.monthlyRent });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  if (invoices.length > 0) {
    await tx.rentInvoice.createMany({ data: invoices, skipDuplicates: true });
  }
  return invoices.length;
}

/** Baux actifs dont la date de fin est dépassée → EXPIRED + bien recalculé. */
export async function expireDueContracts(): Promise<void> {
  const due = await prisma.rentalContract.findMany({
    where: { status: 'ACTIVE', endDate: { lt: new Date() } },
    select: { id: true, propertyId: true },
  });
  for (const contract of due) {
    await prisma.$transaction(async (tx) => {
      await tx.rentalContract.update({ where: { id: contract.id }, data: { status: 'EXPIRED' } });
      await recomputePropertyStatus(tx, contract.propertyId);
    });
  }
}

export async function listContracts(query: ListContractsQuery) {
  await expireDueContracts();

  const pagination = parsePagination(query);
  const where: Prisma.RentalContractWhereInput = {
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { reference: { contains: query.search, mode: 'insensitive' } },
            { property: { title: { contains: query.search, mode: 'insensitive' } } },
            { property: { reference: { contains: query.search, mode: 'insensitive' } } },
            { tenant: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { tenant: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, contracts] = await Promise.all([
    prisma.rentalContract.count({ where }),
    prisma.rentalContract.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: {
        ...contractInclude,
        _count: { select: { invoices: true, inspections: true } },
      },
    }),
  ]);

  return {
    data: contracts.map(({ _count, ...contract }) => ({
      ...toPlain(contract),
      invoicesCount: _count.invoices,
      inspectionsCount: _count.inspections,
    })),
    pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize),
  };
}

export async function getContractById(id: string) {
  const contract = await prisma.rentalContract.findUnique({
    where: { id },
    include: {
      ...contractInclude,
      inspections: { orderBy: { inspectionDate: 'desc' }, include: { items: true, inspector: { select: { id: true, firstName: true, lastName: true } } } },
      invoices: { orderBy: { dueDate: 'asc' }, include: { receipt: { select: { id: true, reference: true } } } },
      payments: { orderBy: { paymentDate: 'desc' } },
      reservation: { select: { id: true, status: true } },
    },
  });
  if (!contract) throw notFound('Contrat de location introuvable.');

  return {
    ...toPlain(contract),
    inspections: contract.inspections.map((inspection) => ({
      ...inspection,
      inspector: inspection.inspector ?? null,
    })),
    invoices: contract.invoices.map((invoice) => ({
      ...invoice,
      expectedAmount: money(invoice.expectedAmount),
      paidAmount: money(invoice.paidAmount),
    })),
    payments: contract.payments.map((payment) => ({ ...payment, amount: money(payment.amount) })),
  };
}

/**
 * Création d'un contrat de location (bail) depuis une demande acceptée
 * ou une réservation active. Créé en DRAFT : l'activation déclenchera
 * le passage du bien en RENTED et la génération des échéances.
 */
export async function createContract(req: AuthenticatedRequest, input: CreateContractInput) {
  let tenantId: string;
  let propertyId: string;
  let reservationId: string | null = null;
  let requestId: string | null = null;
  let defaultRent: number | null = null;
  let description: string;

  if (input.sourceType === 'REQUEST') {
    const request = await prisma.propertyRequest.findUnique({
      where: { id: input.sourceId },
      select: { id: true, status: true, type: true, clientId: true, propertyId: true, proposedAmount: true },
    });
    if (!request) throw notFound('Demande introuvable.');
    if (request.status !== 'ACCEPTED') {
      throw badRequest('Seule une demande acceptée peut donner lieu à un contrat de location.');
    }
    if (request.type !== 'RENTAL') {
      throw badRequest('Seule une demande de location peut donner lieu à un contrat de location.');
    }
    tenantId = request.clientId;
    propertyId = request.propertyId;
    requestId = request.id;
    defaultRent = request.proposedAmount === null ? null : Number(request.proposedAmount);
    description = 'demande acceptée';
  } else {
    const reservation = await prisma.reservation.findUnique({
      where: { id: input.sourceId },
      select: { id: true, status: true, clientId: true, propertyId: true },
    });
    if (!reservation) throw notFound('Réservation introuvable.');
    if (!['ACTIVE', 'CONFIRMED'].includes(reservation.status)) {
      throw badRequest('Seule une réservation active peut donner lieu à un contrat de location.');
    }
    tenantId = reservation.clientId;
    propertyId = reservation.propertyId;
    reservationId = reservation.id;
    description = 'réservation active';
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (endDate <= startDate) {
    throw badRequest('La date de fin de bail doit être postérieure à la date de début.');
  }

  const reference = await generateUniqueReference('BAIL', (ref) =>
    prisma.rentalContract.findUnique({ where: { reference: ref }, select: { id: true } }).then((r) => !!r),
  );

  const contract = await prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: { status: true, rentPrice: true, ownerId: true, isArchived: true },
    });
    if (!property) throw badRequest('Le bien concerné est introuvable.');
    if (property.isArchived) throw badRequest('Ce bien est archivé.');
    if (property.status === 'SOLD') throw badRequest('Ce bien a été vendu : impossible de le louer.');
    if (property.status === 'RENTED') throw badRequest('Ce bien est déjà loué.');
    if (property.status === 'UNAVAILABLE') throw badRequest('Ce bien est actuellement indisponible.');
    if (!property.ownerId) throw badRequest("Ce bien n'a pas de propriétaire associé.");

    const rent = input.monthlyRent ?? defaultRent ?? (property.rentPrice === null ? null : Number(property.rentPrice));
    if (!rent) {
      throw badRequest('Le loyer mensuel doit être défini (ni le bien, ni la source n\'en proposent un).');
    }

    const created = await tx.rentalContract.create({
      data: {
        reference,
        propertyId,
        tenantId,
        ownerId: property.ownerId,
        requestId,
        reservationId,
        startDate,
        endDate,
        monthlyRent: rent,
        depositAmount: input.depositAmount ?? rent,
        paymentDay: input.paymentDay ?? 5,
        status: 'DRAFT',
        notes: input.notes,
      },
      include: contractInclude,
    });

    if (reservationId) {
      await tx.reservation.update({ where: { id: reservationId }, data: { status: 'CONVERTED' } });
    }
    return created;
  });

  await logAudit(prisma, req, {
    action: 'CREATE',
    entityType: 'RentalContract',
    entityId: contract.id,
    details: `Bail ${reference} créé depuis ${description}`,
  });
  return toPlain(contract);
}

/** Activation : le bien devient RENTED et les échéances de loyer sont générées. */
export async function activateContract(req: AuthenticatedRequest, id: string) {
  const contract = await prisma.rentalContract.findUnique({ where: { id }, select: { id: true, status: true, reference: true, propertyId: true, startDate: true, endDate: true, monthlyRent: true, paymentDay: true, reservationId: true } });
  if (!contract) throw notFound('Contrat de location introuvable.');
  if (contract.status !== 'DRAFT') {
    throw badRequest('Seul un contrat en brouillon peut être activé.');
  }

  let invoicesCreated = 0;
  await prisma.$transaction(async (tx) => {
    await tx.rentalContract.update({
      where: { id },
      data: { status: 'ACTIVE', signedAt: new Date() },
    });
    if (contract.reservationId) {
      await tx.reservation.update({ where: { id: contract.reservationId }, data: { status: 'CONVERTED' } });
    }
    invoicesCreated = await generateInvoices(tx, {
      id: contract.id,
      startDate: contract.startDate,
      endDate: contract.endDate,
      monthlyRent: contract.monthlyRent,
      paymentDay: contract.paymentDay,
    }, contract.startDate);
    await recomputePropertyStatus(tx, contract.propertyId);
  });

  await logAudit(prisma, req, {
    action: 'ACTIVATE',
    entityType: 'RentalContract',
    entityId: id,
    details: `Bail ${contract.reference} activé — bien passé en LOUÉ, ${invoicesCreated} échéance(s) générée(s)`,
  });
  return getContractById(id);
}

/** Résiliation : le bien redevient disponible si aucune autre opération ne le bloque. */
export async function terminateContract(req: AuthenticatedRequest, id: string, notes?: string | null) {
  const contract = await prisma.rentalContract.findUnique({ where: { id }, select: { id: true, status: true, reference: true, propertyId: true } });
  if (!contract) throw notFound('Contrat de location introuvable.');
  if (contract.status !== 'ACTIVE') {
    throw badRequest('Seul un contrat actif peut être résilié.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.rentalContract.update({ where: { id }, data: { status: 'TERMINATED', ...(notes !== undefined ? { notes } : {}) } });
    await recomputePropertyStatus(tx, contract.propertyId);
  });

  await logAudit(prisma, req, {
    action: 'TERMINATE',
    entityType: 'RentalContract',
    entityId: id,
    details: notes ? `Bail ${contract.reference} résilié : ${notes}` : `Bail ${contract.reference} résilié`,
  });
  return getContractById(id);
}

/** Renouvellement : prolongation du bail et génération des échéances manquantes. */
export async function renewContract(req: AuthenticatedRequest, id: string, newEndDate: Date) {
  const contract = await prisma.rentalContract.findUnique({ where: { id }, select: { id: true, status: true, reference: true, propertyId: true, endDate: true, startDate: true, monthlyRent: true, paymentDay: true } });
  if (!contract) throw notFound('Contrat de location introuvable.');
  if (!['ACTIVE', 'EXPIRED'].includes(contract.status)) {
    throw badRequest('Seuls les contrats actifs ou arrivés à échéance peuvent être renouvelés.');
  }
  if (newEndDate <= contract.endDate) {
    throw badRequest('La nouvelle date de fin doit être postérieure à la date de fin actuelle.');
  }

  let invoicesCreated = 0;
  await prisma.$transaction(async (tx) => {
    await tx.rentalContract.update({ where: { id }, data: { endDate: newEndDate, status: 'ACTIVE' } });
    // Les échéances sont générées à partir de la fin couverte par les échéances
    // existantes : on repart du mois suivant la dernière échéance connue.
    const lastInvoice = await tx.rentInvoice.findFirst({
      where: { contractId: id },
      orderBy: { dueDate: 'desc' },
      select: { dueDate: true },
    });
    const generationStart = lastInvoice
      ? new Date(lastInvoice.dueDate)
      : contract.startDate;
    invoicesCreated = await generateInvoices(tx, {
      id: contract.id,
      startDate: contract.startDate,
      endDate: newEndDate,
      monthlyRent: contract.monthlyRent,
      paymentDay: contract.paymentDay,
    }, generationStart);
    await recomputePropertyStatus(tx, contract.propertyId);
  });

  await logAudit(prisma, req, {
    action: 'RENEW',
    entityType: 'RentalContract',
    entityId: id,
    details: `Bail ${contract.reference} renouvelé jusqu'au ${newEndDate.toISOString().slice(0, 10)} (${invoicesCreated} nouvelle(s) échéance(s))`,
  });
  return getContractById(id);
}

/** Annulation d'un contrat encore en brouillon. */
export async function cancelContract(req: AuthenticatedRequest, id: string) {
  const contract = await prisma.rentalContract.findUnique({ where: { id }, select: { id: true, status: true, reference: true, propertyId: true, reservationId: true } });
  if (!contract) throw notFound('Contrat de location introuvable.');
  if (contract.status !== 'DRAFT') {
    throw badRequest('Seul un contrat en brouillon peut être annulé. Utilisez la résiliation pour un contrat actif.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.rentalContract.update({ where: { id }, data: { status: 'CANCELLED' } });
    if (contract.reservationId) {
      await tx.reservation.update({ where: { id: contract.reservationId }, data: { status: 'CONFIRMED' } });
    }
    await recomputePropertyStatus(tx, contract.propertyId);
  });

  await logAudit(prisma, req, {
    action: 'CANCEL',
    entityType: 'RentalContract',
    entityId: id,
    details: `Bail ${contract.reference} annulé`,
  });
  return getContractById(id);
}
