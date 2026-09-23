import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { logAudit } from '../../utils/audit.js';
import { recomputePropertyStatus } from '../../utils/property-status.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import type { CreateReservationInput, ListReservationsQuery } from './reservations.validators.js';

const reservationInclude = {
  client: { select: { id: true, firstName: true, lastName: true, phone: true } },
  property: {
    select: {
      id: true, reference: true, title: true, city: true, status: true, price: true, rentPrice: true,
      media: { where: { isPrimary: true, kind: 'PHOTO' as const }, take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.ReservationInclude;

function toPlain(reservation: Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>) {
  const { property, ...rest } = reservation;
  return {
    ...rest,
    property: {
      id: property.id,
      reference: property.reference,
      title: property.title,
      city: property.city,
      status: property.status,
      price: property.price === null ? null : Number(property.price),
      rentPrice: property.rentPrice === null ? null : Number(property.rentPrice),
      primaryPhotoUrl: property.media[0]?.url ?? null,
    },
  };
}

/** Passe en EXPIRED les réservations actives dont la date est dépassée. */
export async function expireDueReservations(): Promise<void> {
  const due = await prisma.reservation.findMany({
    where: { status: { in: ['ACTIVE', 'CONFIRMED'] }, expiresAt: { lt: new Date() } },
    select: { id: true, propertyId: true },
  });
  for (const reservation of due) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'EXPIRED' } });
      await recomputePropertyStatus(tx, reservation.propertyId);
    });
  }
}

export async function listReservations(query: ListReservationsQuery) {
  await expireDueReservations();

  const pagination = parsePagination(query);
  const where: Prisma.ReservationWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { property: { title: { contains: query.search, mode: 'insensitive' } } },
            { property: { reference: { contains: query.search, mode: 'insensitive' } } },
            { client: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { client: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, reservations] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: reservationInclude,
    }),
  ]);

  return { data: reservations.map(toPlain), pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

export async function getReservationById(id: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: reservationInclude });
  if (!reservation) throw notFound('Réservation introuvable.');
  return toPlain(reservation);
}

/**
 * Création d'une réservation depuis une demande ou une offre acceptée.
 * La réservation active place automatiquement le bien en RESERVED.
 */
export async function createReservation(req: AuthenticatedRequest, input: CreateReservationInput) {
  let clientId: string;
  let propertyId: string;
  let description: string;

  if (input.sourceType === 'REQUEST') {
    const request = await prisma.propertyRequest.findUnique({
      where: { id: input.sourceId },
      select: { id: true, status: true, type: true, clientId: true, propertyId: true },
    });
    if (!request) throw notFound('Demande introuvable.');
    if (request.status !== 'ACCEPTED') {
      throw badRequest('Seule une demande acceptée peut donner lieu à une réservation.');
    }
    clientId = request.clientId;
    propertyId = request.propertyId;
    description = 'demande acceptée';
  } else {
    const offer = await prisma.purchaseOffer.findUnique({
      where: { id: input.sourceId },
      select: { id: true, status: true, clientId: true, propertyId: true, amount: true },
    });
    if (!offer) throw notFound('Offre introuvable.');
    if (offer.status !== 'ACCEPTED') {
      throw badRequest('Seule une offre acceptée peut donner lieu à une réservation.');
    }
    clientId = offer.clientId;
    propertyId = offer.propertyId;
    description = `offre acceptée de ${Number(offer.amount)} FCFA`;
  }

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (expiresAt.getTime() <= Date.now()) {
    throw badRequest("La date d'expiration doit être dans le futur.");
  }

  const reservation = await prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({ where: { id: propertyId }, select: { status: true, isArchived: true } });
    if (!property) throw badRequest('Le bien concerné est introuvable.');
    if (property.isArchived) throw badRequest('Ce bien est archivé.');
    if (property.status !== 'AVAILABLE') {
      throw badRequest('Ce bien n\'est pas disponible : une autre opération est en cours.');
    }

    const created = await tx.reservation.create({
      data: {
        clientId,
        propertyId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        requestId: input.sourceType === 'REQUEST' ? input.sourceId : null,
        offerId: input.sourceType === 'OFFER' ? input.sourceId : null,
        expiresAt,
        status: 'ACTIVE',
      },
    });
    await tx.property.update({ where: { id: propertyId }, data: { status: 'RESERVED' } });
    return created.id;
  });

  await logAudit(prisma, req, {
    action: 'CREATE',
    entityType: 'Reservation',
    entityId: reservation,
    details: `Réservation depuis ${description} (expire le ${expiresAt.toISOString()})`,
  });
  return getReservationById(reservation);
}

/** Confirmation d'une réservation active. */
export async function confirmReservation(req: AuthenticatedRequest, id: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!reservation) throw notFound('Réservation introuvable.');
  if (reservation.status !== 'ACTIVE') {
    throw badRequest('Seule une réservation active peut être confirmée.');
  }

  const updated = await prisma.reservation.update({ where: { id }, data: { status: 'CONFIRMED' }, include: reservationInclude });
  await logAudit(prisma, req, { action: 'CONFIRM', entityType: 'Reservation', entityId: id, details: 'Réservation confirmée' });
  return toPlain(updated);
}

/** Annulation : le bien redevient disponible si aucune autre opération ne le bloque. */
export async function cancelReservation(req: AuthenticatedRequest, id: string, reason?: string | null) {
  const reservation = await prisma.reservation.findUnique({ where: { id }, select: { id: true, status: true, propertyId: true } });
  if (!reservation) throw notFound('Réservation introuvable.');
  if (!['ACTIVE', 'CONFIRMED'].includes(reservation.status)) {
    throw badRequest('Cette réservation n\'est plus active.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({ where: { id }, data: { status: 'CANCELLED' } });
    await recomputePropertyStatus(tx, reservation.propertyId);
  });

  await logAudit(prisma, req, {
    action: 'CANCEL',
    entityType: 'Reservation',
    entityId: id,
    details: reason ? `Réservation annulée : ${reason}` : 'Réservation annulée',
  });
  return getReservationById(id);
}
