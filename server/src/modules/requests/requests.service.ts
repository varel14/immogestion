import type { Prisma, RequestStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { money } from '../../utils/serializers.js';
import type { CreateRequestInput, ListRequestsQuery } from './requests.validators.js';

const requestInclude = {
  client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  property: {
    select: {
      id: true, reference: true, title: true, city: true, status: true,
      price: true, rentPrice: true, transactionType: true,
      media: { where: { isPrimary: true, kind: 'PHOTO' as const }, take: 1, select: { url: true } },
    },
  },
  offers: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.PropertyRequestInclude;

function toPlain(request: Prisma.PropertyRequestGetPayload<{ include: typeof requestInclude }>) {
  const { property, offers, ...rest } = request;
  return {
    ...rest,
    property: {
      ...property,
      price: money(property.price),
      rentPrice: money(property.rentPrice),
      primaryPhotoUrl: property.media[0]?.url ?? null,
      media: undefined,
    },
    offers: offers.map((offer) => ({ ...offer, amount: money(offer.amount) })),
    proposedAmount: money(request.proposedAmount),
  };
}

export async function listRequests(query: ListRequestsQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.PropertyRequestWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.type ? { type: query.type } : {}),
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

  const [total, requests] = await Promise.all([
    prisma.propertyRequest.count({ where }),
    prisma.propertyRequest.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: { client: true, property: { include: { media: { where: { isPrimary: true }, take: 1 } } }, _count: { select: { offers: true } } },
    }),
  ]);

  return {
    data: requests.map(({ property, _count, ...request }) => ({
      ...request,
      offersCount: _count.offers,
      property: {
        id: property.id,
        reference: property.reference,
        title: property.title,
        city: property.city,
        status: property.status,
        price: money(property.price),
        rentPrice: money(property.rentPrice),
        primaryPhotoUrl: property.media[0]?.url ?? null,
      },
    })),
    pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize),
  };
}

export async function getRequestById(id: string) {
  const request = await prisma.propertyRequest.findUnique({ where: { id }, include: requestInclude });
  if (!request) {
    throw notFound('Demande introuvable.');
  }
  return toPlain(request);
}

export async function createRequest(input: CreateRequestInput) {
  const [client, property] = await Promise.all([
    prisma.client.findUnique({ where: { id: input.clientId }, select: { id: true } }),
    prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, transactionType: true } }),
  ]);
  if (!client) throw badRequest('Le client sélectionné est introuvable.');
  if (!property) throw badRequest('Le bien sélectionné est introuvable.');

  if (property.transactionType === 'SALE' && input.type === 'RENTAL') {
    throw badRequest('Ce bien est proposé uniquement à la vente : impossible de déposer une demande de location.');
  }
  if (property.transactionType === 'RENT' && input.type === 'PURCHASE') {
    throw badRequest('Ce bien est proposé uniquement à la location : impossible de déposer une demande d\'achat.');
  }

  const request = await prisma.propertyRequest.create({ data: input, include: requestInclude });
  return toPlain(request);
}

const TERMINAL_STATUSES = ['ACCEPTED', 'REFUSED', 'CANCELLED'];

export async function updateRequestStatus(id: string, status: RequestStatus, notes?: string | null) {
  const request = await prisma.propertyRequest.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!request) throw notFound('Demande introuvable.');
  if (TERMINAL_STATUSES.includes(request.status) && request.status !== status) {
    throw badRequest('Cette demande est déjà clôturée : son statut ne peut plus être modifié.');
  }

  await prisma.propertyRequest.update({
    where: { id },
    data: { status, ...(notes !== undefined ? { notes } : {}) },
  });
  return getRequestById(id);
}
