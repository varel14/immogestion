import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { generatePropertyReference } from '../../utils/reference.js';
import { toPlainProperty } from '../../utils/serializers.js';
import type { CreatePropertyInput, ListPropertiesQuery } from './properties.validators.js';

const propertyInclude = {
  owner: { select: { id: true, firstName: true, lastName: true } },
  media: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
} satisfies Prisma.PropertyInclude;

function searchWhere(search?: string): Prisma.PropertyWhereInput {
  if (!search) return {};
  return {
    OR: [
      { title: { contains: search, mode: 'insensitive' } },
      { reference: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { district: { contains: search, mode: 'insensitive' } },
    ],
  };
}

/** Filtre de prix : s'applique au prix de vente et/ou au loyer selon la transaction. */
function priceWhere(minPrice?: number, maxPrice?: number): Prisma.PropertyWhereInput[] {
  if (minPrice === undefined && maxPrice === undefined) return [];
  const condition: Prisma.PropertyWhereInput = {};
  if (minPrice !== undefined && maxPrice !== undefined) {
    condition.OR = [{ price: { gte: minPrice, lte: maxPrice } }, { rentPrice: { gte: minPrice, lte: maxPrice } }];
  } else if (minPrice !== undefined) {
    condition.OR = [{ price: { gte: minPrice } }, { rentPrice: { gte: minPrice } }];
  } else {
    condition.OR = [{ price: { lte: maxPrice! } }, { rentPrice: { lte: maxPrice! } }];
  }
  return [condition];
}

export async function listProperties(query: ListPropertiesQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.PropertyWhereInput = {
    ...searchWhere(query.search),
    ...(query.propertyType ? { propertyType: query.propertyType } : {}),
    ...(query.transactionType ? { transactionType: query.transactionType } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.isArchived !== undefined ? { isArchived: query.isArchived } : { isArchived: false }),
    AND: priceWhere(query.minPrice, query.maxPrice),
  };

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: propertyInclude,
    }),
  ]);

  return {
    data: properties.map(toPlainProperty),
    pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize),
  };
}

export async function getPropertyById(id: string) {
  const property = await prisma.property.findUnique({ where: { id }, include: propertyInclude });
  if (!property) {
    throw notFound('Bien introuvable.');
  }
  return toPlainProperty(property);
}

async function assertOwnerExists(ownerId: string | null) {
  if (!ownerId) return;
  const owner = await prisma.owner.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) {
    throw badRequest('Le propriétaire sélectionné est introuvable.');
  }
}

export async function createProperty(input: CreatePropertyInput) {
  await assertOwnerExists(input.ownerId);
  const reference = await generatePropertyReference();
  const property = await prisma.property.create({
    data: { ...input, reference },
    include: propertyInclude,
  });
  return toPlainProperty(property);
}

export async function updateProperty(id: string, input: CreatePropertyInput) {
  const existing = await prisma.property.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw notFound('Bien introuvable.');
  }
  await assertOwnerExists(input.ownerId);
  // La référence est générée automatiquement et n'est pas modifiable.
  const { ownerId, ...fields } = input;
  const property = await prisma.property.update({
    where: { id },
    data: { ...fields, ownerId },
    include: propertyInclude,
  });
  return toPlainProperty(property);
}

export async function setPropertyArchived(id: string, isArchived: boolean) {
  const property = await prisma.property.update({ where: { id }, data: { isArchived } });
  return property;
}
