import type { Prisma } from '@prisma/client';

/**
 * Convertit les champs Decimal de Prisma en nombres JavaScript
 * pour un JSON propre côté client.
 */
export function toPlainProperty<T extends { price: Prisma.Decimal | null; rentPrice: Prisma.Decimal | null }>(
  property: T,
): Omit<T, 'price' | 'rentPrice'> & { price: number | null; rentPrice: number | null } {
  return {
    ...property,
    price: property.price === null ? null : Number(property.price),
    rentPrice: property.rentPrice === null ? null : Number(property.rentPrice),
  };
}

/** Retire le hash de mot de passe d'un utilisateur avant envoi au client. */
export function toPublicUser<T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}
