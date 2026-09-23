import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { generateUniqueReference } from '../../utils/reference-generic.js';
import { money } from '../../utils/serializers.js';
import { logAudit } from '../../utils/audit.js';
import { recomputePropertyStatus } from '../../utils/property-status.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import type { CreateSaleInput, ListSalesQuery, UpdateSaleInput } from './sales.validators.js';

const saleInclude = {
  property: { select: { id: true, reference: true, title: true, city: true, status: true } },
  buyer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  agent: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.SaleInclude;

function toPlain(sale: Prisma.SaleGetPayload<{ include: typeof saleInclude }>) {
  return {
    ...sale,
    salePrice: money(sale.salePrice),
  };
}

/** Montant total payé (paiements valides uniquement) — jamais stocké. */
export async function salePaidAmount(saleId: string): Promise<number> {
  const aggregate = await prisma.payment.aggregate({
    where: { saleId, status: 'CONFIRMED' },
    _sum: { amount: true },
  });
  return money(aggregate._sum.amount) ?? 0;
}

export async function listSales(query: ListSalesQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.SaleWhereInput = {
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.buyerId ? { buyerId: query.buyerId } : {}),
    ...(query.agentId ? { agentId: query.agentId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { reference: { contains: query.search, mode: 'insensitive' } },
            { property: { title: { contains: query.search, mode: 'insensitive' } } },
            { property: { reference: { contains: query.search, mode: 'insensitive' } } },
            { buyer: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { buyer: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: saleInclude,
    }),
  ]);

  return { data: sales.map(toPlain), pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({ where: { id }, include: saleInclude });
  if (!sale) throw notFound('Vente introuvable.');
  const [paidAmount, payments] = await Promise.all([
    salePaidAmount(id),
    prisma.payment.findMany({ where: { saleId: id }, orderBy: [{ paymentDate: 'desc' }] }),
  ]);
  return {
    ...toPlain(sale),
    paidAmount,
    remainingAmount: Number(sale.salePrice) - paidAmount,
    payments: payments.map((p) => ({ ...p, amount: money(p.amount) })),
  };
}

/**
 * Création d'une vente depuis une demande acceptée ou une réservation active.
 * Le statut du bien n'est modifié qu'à la finalisation.
 */
export async function createSale(req: AuthenticatedRequest, input: CreateSaleInput) {
  let buyerId: string;
  let propertyId: string;
  let reservationId: string | null = null;
  let requestId: string | null = null;
  let defaultPrice: number | null = null;
  let description: string;

  if (input.sourceType === 'REQUEST') {
    const request = await prisma.propertyRequest.findUnique({
      where: { id: input.sourceId },
      select: { id: true, status: true, type: true, clientId: true, propertyId: true, proposedAmount: true },
    });
    if (!request) throw notFound('Demande introuvable.');
    if (request.status !== 'ACCEPTED') {
      throw badRequest('Seule une demande acceptée peut donner lieu à une vente.');
    }
    if (request.type !== 'PURCHASE') {
      throw badRequest('Seule une demande d\'achat peut donner lieu à une vente.');
    }
    buyerId = request.clientId;
    propertyId = request.propertyId;
    requestId = request.id;
    defaultPrice = request.proposedAmount === null ? null : Number(request.proposedAmount);
    description = 'demande acceptée';
  } else {
    const reservation = await prisma.reservation.findUnique({
      where: { id: input.sourceId },
      select: { id: true, status: true, clientId: true, propertyId: true, offerId: true },
    });
    if (!reservation) throw notFound('Réservation introuvable.');
    if (!['ACTIVE', 'CONFIRMED'].includes(reservation.status)) {
      throw badRequest('Seule une réservation active peut donner lieu à une vente.');
    }
    buyerId = reservation.clientId;
    propertyId = reservation.propertyId;
    reservationId = reservation.id;
    description = 'réservation active';
  }

  const reference = await generateUniqueReference('VTE', (ref) =>
    prisma.sale.findUnique({ where: { reference: ref }, select: { id: true } }).then((r) => !!r),
  );

  const sale = await prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({ where: { id: propertyId }, select: { status: true, price: true, ownerId: true, isArchived: true } });
    if (!property) throw badRequest('Le bien concerné est introuvable.');
    if (property.isArchived) throw badRequest('Ce bien est archivé.');
    if (property.status === 'SOLD') throw badRequest('Ce bien a déjà été vendu.');
    if (property.status === 'RENTED') throw badRequest('Ce bien est actuellement loué : impossible de le vendre.');
    if (property.status === 'UNAVAILABLE') throw badRequest('Ce bien est actuellement indisponible.');
    if (!property.ownerId) throw badRequest("Ce bien n'a pas de propriétaire associé.");

    const price = input.salePrice ?? defaultPrice ?? (property.price === null ? null : Number(property.price));
    if (!price) {
      throw badRequest('Le prix de vente doit être défini (ni le bien, ni la source n\'en proposent un).');
    }

    const created = await tx.sale.create({
      data: {
        reference,
        propertyId,
        buyerId,
        ownerId: property.ownerId,
        agentId: input.agentId,
        requestId,
        reservationId,
        salePrice: price,
        status: 'PREPARATION',
        saleDate: input.saleDate ? new Date(input.saleDate) : null,
        notes: input.notes,
      },
      include: saleInclude,
    });

    if (reservationId) {
      await tx.reservation.update({ where: { id: reservationId }, data: { status: 'CONVERTED' } });
    }
    return created;
  });

  await logAudit(prisma, req, {
    action: 'CREATE',
    entityType: 'Sale',
    entityId: sale.id,
    details: `Vente ${reference} créée depuis ${description} (${Number(sale.salePrice)} FCFA)`,
  });
  return toPlain(sale);
}

/** Modification d'une vente non finalisée et non annulée. */
export async function updateSale(req: AuthenticatedRequest, id: string, input: UpdateSaleInput) {
  const sale = await prisma.sale.findUnique({ where: { id }, select: { id: true, status: true, reference: true } });
  if (!sale) throw notFound('Vente introuvable.');
  if (sale.status === 'FINALIZED') {
    throw badRequest('Une vente finalisée ne peut plus être modifiée.');
  }
  if (sale.status === 'CANCELLED') {
    throw badRequest('Une vente annulée ne peut plus être modifiée.');
  }
  if (input.status === 'FINALIZED') {
    throw badRequest('Utilisez l\'action « Finaliser » pour clôturer une vente.');
  }

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
      ...(input.salePrice !== undefined ? { salePrice: input.salePrice } : {}),
      ...(input.saleDate !== undefined ? { saleDate: input.saleDate ? new Date(input.saleDate) : null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: saleInclude,
  });

  await logAudit(prisma, req, { action: 'UPDATE', entityType: 'Sale', entityId: id, details: `Vente ${sale.reference} modifiée` });
  return toPlain(updated);
}

/** Finalisation : la vente est conclue et le bien devient SOLD. */
export async function finalizeSale(req: AuthenticatedRequest, id: string, saleDate?: string | null) {
  const sale = await prisma.sale.findUnique({ where: { id }, select: { id: true, status: true, reference: true, propertyId: true } });
  if (!sale) throw notFound('Vente introuvable.');
  if (sale.status === 'FINALIZED') throw badRequest('Cette vente est déjà finalisée.');
  if (sale.status === 'CANCELLED') throw badRequest('Une vente annulée ne peut pas être finalisée.');

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id },
      data: { status: 'FINALIZED', saleDate: saleDate ? new Date(saleDate) : new Date() },
    });
    await recomputePropertyStatus(tx, sale.propertyId);
  });

  await logAudit(prisma, req, {
    action: 'FINALIZE',
    entityType: 'Sale',
    entityId: id,
    details: `Vente ${sale.reference} finalisée — bien passé en VENDU`,
  });
  return getSaleById(id);
}

/**
 * Enregistrement d'un paiement pour une vente (intégral ou par versements).
 * Le total payé est recalculé depuis les paiements valides ; le dépassement
 * du prix de vente est bloqué.
 */
export async function paySale(
  req: AuthenticatedRequest,
  id: string,
  input: { amount: number; paymentMethod: string; paymentDate?: string; transactionReference?: string | null; notes?: string | null },
) {
  const sale = await prisma.sale.findUnique({ where: { id }, include: { property: { select: { reference: true } } } });
  if (!sale) throw notFound('Vente introuvable.');
  if (sale.status === 'CANCELLED') {
    throw badRequest('Impossible d\'enregistrer un paiement sur une vente annulée.');
  }

  const paid = await salePaidAmount(id);
  const remaining = Number(sale.salePrice) - paid;
  if (input.amount > remaining) {
    throw badRequest(
      `Le paiement (${input.amount} FCFA) dépasse le solde restant (${remaining} FCFA) sur le prix de vente de ${Number(sale.salePrice)} FCFA.`,
    );
  }

  const reference = await generateUniqueReference('PAY', (ref) =>
    prisma.payment.findUnique({ where: { reference: ref }, select: { id: true } }).then((r) => !!r),
  );

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        reference,
        clientId: sale.buyerId,
        amount: input.amount,
        paymentType: 'SALE',
        paymentMethod: input.paymentMethod as never,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        status: 'CONFIRMED',
        transactionReference: input.transactionReference,
        notes: input.notes,
        saleId: sale.id,
      },
    });
    return created;
  });

  const newPaid = paid + input.amount;
  await logAudit(prisma, req, {
    action: 'PAY',
    entityType: 'Sale',
    entityId: id,
    details: `Versement de ${input.amount} FCFA sur la vente ${sale.reference} (total payé : ${newPaid} FCFA)`,
  });

  return {
    payment: { ...payment, amount: Number(payment.amount) },
    paidAmount: newPaid,
    remainingAmount: Number(sale.salePrice) - newPaid,
  };
}

/** Annulation : le bien retrouve son statut recalculé. */
export async function cancelSale(req: AuthenticatedRequest, id: string, reason?: string | null) {
  const sale = await prisma.sale.findUnique({ where: { id }, select: { id: true, status: true, reference: true, propertyId: true, reservationId: true } });
  if (!sale) throw notFound('Vente introuvable.');
  if (sale.status === 'FINALIZED') {
    throw badRequest('Une vente finalisée ne peut pas être annulée. Cette situation nécessite un traitement métier dédié.');
  }
  if (sale.status === 'CANCELLED') throw badRequest('Cette vente est déjà annulée.');

  const paid = await salePaidAmount(id);
  if (paid > 0) {
    throw badRequest(
      `Impossible d'annuler : des paiements d'un total de ${paid} FCFA ont déjà été enregistrés. Annulez d'abord les paiements concernés.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({ where: { id }, data: { status: 'CANCELLED', notes: reason ?? undefined } });
    if (sale.reservationId) {
      // La réservation d'origine redevient active.
      await tx.reservation.update({ where: { id: sale.reservationId }, data: { status: 'CONFIRMED' } });
    }
    await recomputePropertyStatus(tx, sale.propertyId);
  });

  await logAudit(prisma, req, {
    action: 'CANCEL',
    entityType: 'Sale',
    entityId: id,
    details: reason ? `Vente ${sale.reference} annulée : ${reason}` : `Vente ${sale.reference} annulée`,
  });
  return getSaleById(id);
}
