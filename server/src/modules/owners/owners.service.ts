import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import type { CreateOwnerInput, ListOwnersQuery } from './owners.validators.js';

/** Critère de recherche : nom, prénom, téléphone, email ou pièce d'identité. */
function searchWhere(search?: string): Prisma.OwnerWhereInput {
  if (!search) return {};
  return {
    OR: [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { identificationNumber: { contains: search, mode: 'insensitive' } },
    ],
  };
}

export async function listOwners(query: ListOwnersQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.OwnerWhereInput = searchWhere(query.search);

  const [total, owners] = await Promise.all([
    prisma.owner.count({ where }),
    prisma.owner.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: { _count: { select: { properties: true } } },
    }),
  ]);

  return {
    data: owners.map(({ _count, ...owner }) => ({ ...owner, propertiesCount: _count.properties })),
    pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize),
  };
}

export async function getOwnerById(id: string) {
  const owner = await prisma.owner.findUnique({
    where: { id },
    include: { _count: { select: { properties: true } } },
  });
  if (!owner) {
    throw notFound('Propriétaire introuvable.');
  }
  const { _count, ...rest } = owner;
  return { ...rest, propertiesCount: _count.properties };
}

export async function getOwnerProperties(ownerId: string) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) {
    throw notFound('Propriétaire introuvable.');
  }
  const properties = await prisma.property.findMany({
    where: { ownerId },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      media: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  });
  return properties.map(({ media, ...property }) => ({
    ...property,
    price: property.price === null ? null : Number(property.price),
    rentPrice: property.rentPrice === null ? null : Number(property.rentPrice),
    primaryPhotoUrl: media[0]?.url ?? null,
  }));
}

export async function createOwner(input: CreateOwnerInput) {
  return prisma.owner.create({ data: input });
}

export async function updateOwner(id: string, input: CreateOwnerInput) {
  const existing = await prisma.owner.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw notFound('Propriétaire introuvable.');
  }
  return prisma.owner.update({ where: { id }, data: input });
}
