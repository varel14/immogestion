import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound } from '../../utils/app-error.js';
import { toPublicUser } from '../../utils/serializers.js';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination.js';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.validators.js';

/** Critère de recherche : prénom, nom, email ou téléphone. */
function searchWhere(search?: string): Prisma.UserWhereInput {
  if (!search) return {};
  return {
    OR: [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ],
  };
}

export async function listUsers(query: ListUsersQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.UserWhereInput = {
    ...searchWhere(query.search),
    ...(query.role ? { role: query.role } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    data: users.map(toPublicUser),
    pagination: buildPaginationMeta(total, pagination.page, pagination.pageSize),
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw notFound('Utilisateur introuvable.');
  }
  return toPublicUser(user);
}

async function assertEmailAvailable(email: string, excludeUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== excludeUserId) {
    throw conflict('Un utilisateur avec cet email existe déjà.');
  }
}

export async function createUser(input: CreateUserInput) {
  await assertEmailAvailable(input.email);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      role: input.role,
      isActive: input.isActive,
      passwordHash,
    },
  });
  return toPublicUser(user);
}

export async function updateUser(id: string, input: UpdateUserInput) {
  await assertEmailAvailable(input.email, id);

  const data: Prisma.UserUpdateInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    role: input.role,
    isActive: input.isActive,
  };
  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const user = await prisma.user.update({ where: { id }, data });
  return toPublicUser(user);
}

export async function updateUserStatus(id: string, isActive: boolean) {
  const user = await prisma.user.update({ where: { id }, data: { isActive } });
  return toPublicUser(user);
}
