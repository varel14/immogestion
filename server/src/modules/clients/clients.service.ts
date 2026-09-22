import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/app-error.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import type { CreateClientInput, ListClientsQuery } from './clients.validators.js';

function searchWhere(search?: string): Prisma.ClientWhereInput {
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

export async function listClients(query: ListClientsQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.ClientWhereInput = {
    ...searchWhere(query.search),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  };

  const [total, clients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return { data: clients, pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize) };
}

export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    throw notFound('Client introuvable.');
  }
  return client;
}

export async function createClient(input: CreateClientInput) {
  return prisma.client.create({ data: input });
}

export async function updateClient(id: string, input: CreateClientInput) {
  const existing = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw notFound('Client introuvable.');
  }
  return prisma.client.update({ where: { id }, data: input });
}

export async function updateClientStatus(id: string, isActive: boolean) {
  const client = await prisma.client.update({ where: { id }, data: { isActive } });
  return client;
}
