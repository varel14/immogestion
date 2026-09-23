import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { money } from '../../utils/serializers.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { logAudit } from '../../utils/audit.js';
import type { CreateOfferInput, ListOffersQuery, UpdateOfferInput } from './offers.validators.js';

const offerInclude = {
  client: { select: { id: true, firstName: true, lastName: true, phone: true } },
  property: { select: { id: true, reference: true, title: true, city: true, price: true } },
  request: { select: { id: true, type: true, status: true, proposedAmount: true } },
} satisfies Prisma.PurchaseOfferInclude;

function toPlain(offer: Prisma.PurchaseOfferGetPayload<{ include: typeof offerInclude }>) {
  const { property, request, ...rest } = offer;
  return {
    ...rest,
    property: { ...property, price: money(property.price) },
    request: { ...request, proposedAmount: money(request.proposedAmount) },
    amount: money(offer.amount),
  };
}

export async function listOffers(query: ListOffersQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.PurchaseOfferWhereInput = {
    ...(query.requestId ? { requestId: query.requestId } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, offers] = await Promise.all([
    prisma.purchaseOffer.count({ where }),
    prisma.purchaseOffer.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: offerInclude,
    }),
  ]);

  return { data: offers.map(toPlain), pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

export async function getOfferById(id: string) {
  const offer = await prisma.purchaseOffer.findUnique({ where: { id }, include: offerInclude });
  if (!offer) throw notFound('Offre introuvable.');
  return toPlain(offer);
}

/** Création d'une offre : l'historique est conservé, chaque offre est une nouvelle ligne. */
export async function createOffer(req: AuthenticatedRequest, input: CreateOfferInput) {
  const request = await prisma.propertyRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, type: true, status: true, clientId: true, propertyId: true },
  });
  if (!request) throw notFound('Demande introuvable.');
  if (request.type !== 'PURCHASE') {
    throw badRequest('Les offres d\'achat concernent uniquement les demandes d\'achat.');
  }
  if (['CANCELLED', 'REFUSED'].includes(request.status)) {
    throw badRequest('Impossible de formuler une offre sur une demande annulée ou refusée.');
  }

  const offer = await prisma.purchaseOffer.create({
    data: {
      requestId: request.id,
      clientId: request.clientId,
      propertyId: request.propertyId,
      amount: input.amount,
      observations: input.observations,
    },
    include: offerInclude,
  });

  // Une demande avec une offre passe automatiquement « en cours d'étude ».
  if (request.status === 'PENDING') {
    await prisma.propertyRequest.update({ where: { id: request.id }, data: { status: 'UNDER_REVIEW' } });
  }

  await logAudit(prisma, req, {
    action: 'CREATE',
    entityType: 'PurchaseOffer',
    entityId: offer.id,
    details: `Offre d'achat de ${input.amount} FCFA formulée`,
  });
  return toPlain(offer);
}

/** Modification d'une offre encore en attente uniquement. */
export async function updateOffer(req: AuthenticatedRequest, id: string, input: UpdateOfferInput) {
  const offer = await prisma.purchaseOffer.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!offer) throw notFound('Offre introuvable.');
  if (offer.status !== 'PENDING') {
    throw badRequest('Seule une offre encore en attente peut être modifiée.');
  }

  const updated = await prisma.purchaseOffer.update({ where: { id }, data: input, include: offerInclude });
  await logAudit(prisma, req, { action: 'UPDATE', entityType: 'PurchaseOffer', entityId: id, details: 'Offre modifiée' });
  return toPlain(updated);
}

/** Acceptation d'une offre : la demande associée devient acceptée. */
export async function acceptOffer(req: AuthenticatedRequest, id: string, observations?: string | null) {
  const offer = await prisma.purchaseOffer.findUnique({ where: { id }, select: { id: true, status: true, requestId: true, amount: true } });
  if (!offer) throw notFound('Offre introuvable.');
  if (offer.status !== 'PENDING') {
    throw badRequest('Cette offre a déjà été traitée.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.purchaseOffer.update({
      where: { id },
      data: { status: 'ACCEPTED', ...(observations !== undefined ? { observations } : {}) },
    });
    await tx.propertyRequest.update({ where: { id: offer.requestId }, data: { status: 'ACCEPTED' } });
    return true;
  });
  void updated;

  await logAudit(prisma, req, {
    action: 'ACCEPT',
    entityType: 'PurchaseOffer',
    entityId: id,
    details: `Offre de ${Number(offer.amount)} FCFA acceptée`,
  });
  return getOfferById(id);
}

/** Refus d'une offre : l'historique est conservé. */
export async function refuseOffer(req: AuthenticatedRequest, id: string, observations?: string | null) {
  const offer = await prisma.purchaseOffer.findUnique({ where: { id }, select: { id: true, status: true, amount: true } });
  if (!offer) throw notFound('Offre introuvable.');
  if (offer.status !== 'PENDING') {
    throw badRequest('Cette offre a déjà été traitée.');
  }

  const updated = await prisma.purchaseOffer.update({
    where: { id },
    data: { status: 'REFUSED', ...(observations !== undefined ? { observations } : {}) },
    include: offerInclude,
  });

  await logAudit(prisma, req, {
    action: 'REFUSE',
    entityType: 'PurchaseOffer',
    entityId: id,
    details: `Offre de ${Number(offer.amount)} FCFA refusée`,
  });
  return toPlain(updated);
}
