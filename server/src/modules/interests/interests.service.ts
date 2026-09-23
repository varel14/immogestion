import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { money } from '../../utils/serializers.js';
import type { CreateInterestInput, ListInterestsQuery, UpdateInterestInput } from './interests.validators.js';

const interestInclude = {
  client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  property: {
    select: {
      id: true, reference: true, title: true, city: true, status: true,
      price: true, rentPrice: true, transactionType: true,
      media: { where: { isPrimary: true, kind: 'PHOTO' as const }, take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.ClientInterestInclude;

function toPlain(interest: Prisma.ClientInterestGetPayload<{ include: typeof interestInclude }>) {
  const { property, ...rest } = interest;
  return {
    ...rest,
    property: {
      ...property,
      price: money(property.price),
      rentPrice: money(property.rentPrice),
      primaryPhotoUrl: property.media[0]?.url ?? null,
      media: undefined,
    },
  };
}

export async function listInterests(query: ListInterestsQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.ClientInterestWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.transactionType ? { transactionType: query.transactionType } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, interests] = await Promise.all([
    prisma.clientInterest.count({ where }),
    prisma.clientInterest.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: interestInclude,
    }),
  ]);

  return { data: interests.map(toPlain), pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

export async function getInterestById(id: string) {
  const interest = await prisma.clientInterest.findUnique({ where: { id }, include: interestInclude });
  if (!interest) {
    throw notFound("Intérêt introuvable.");
  }
  return toPlain(interest);
}

export async function createInterest(input: CreateInterestInput) {
  const [client, property] = await Promise.all([
    prisma.client.findUnique({ where: { id: input.clientId }, select: { id: true, isActive: true } }),
    prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, transactionType: true } }),
  ]);
  if (!client) throw badRequest('Le client sélectionné est introuvable.');
  if (!property) throw badRequest('Le bien sélectionné est introuvable.');

  // Cohérence transaction du bien : un bien en vente seule ne peut recevoir
  // qu'un intérêt d'achat, un bien en location seule qu'un intérêt de location.
  if (property.transactionType === 'SALE' && input.transactionType === 'RENT') {
    throw badRequest('Ce bien est proposé uniquement à la vente : impossible d\'enregistrer un intérêt de location.');
  }
  if (property.transactionType === 'RENT' && input.transactionType === 'SALE') {
    throw badRequest('Ce bien est proposé uniquement à la location : impossible d\'enregistrer un intérêt d\'achat.');
  }

  const existing = await prisma.clientInterest.findUnique({
    where: { clientId_propertyId_transactionType: { clientId: input.clientId, propertyId: input.propertyId, transactionType: input.transactionType } },
  });
  if (existing) {
    throw badRequest('Cet intérêt existe déjà pour ce client et ce bien.');
  }

  return prisma.clientInterest.create({ data: input, include: interestInclude }).then(toPlain);
}

export async function updateInterest(id: string, input: UpdateInterestInput) {
  const interest = await prisma.clientInterest.findUnique({ where: { id }, select: { id: true } });
  if (!interest) throw notFound("Intérêt introuvable.");

  return prisma.clientInterest.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: interestInclude,
  }).then(toPlain);
}
