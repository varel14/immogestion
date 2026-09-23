import type { Prisma } from '@prisma/client';
import { badRequest } from './app-error.js';

type Db = Prisma.TransactionClient;

/** Statuts de réservation considérés comme actifs. */
export const ACTIVE_RESERVATION_STATUSES = ['ACTIVE', 'CONFIRMED'] as const;

/**
 * Recalcule le statut du bien à partir des opérations en cours :
 *  1. vente finalisée            → SOLD
 *  2. contrat de location actif  → RENTED
 *  3. réservation active         → RESERVED
 *  4. sinon                      → AVAILABLE
 * À appeler dans une transaction après toute opération métier.
 */
export async function recomputePropertyStatus(db: Db, propertyId: string): Promise<string> {
  const [finalizedSale, activeLease, activeReservation] = await Promise.all([
    db.sale.findFirst({ where: { propertyId, status: 'FINALIZED' }, select: { id: true } }),
    db.rentalContract.findFirst({ where: { propertyId, status: 'ACTIVE' }, select: { id: true } }),
    db.reservation.findFirst({
      where: { propertyId, status: { in: [...ACTIVE_RESERVATION_STATUSES] } },
      select: { id: true },
    }),
  ]);

  const status = finalizedSale ? 'SOLD' : activeLease ? 'RENTED' : activeReservation ? 'RESERVED' : 'AVAILABLE';

  await db.property.update({ where: { id: propertyId }, data: { status } });
  return status;
}

/** Vérifie qu'un bien peut faire l'objet d'une réservation / vente / location. */
export async function assertPropertyAvailable(db: Db, propertyId: string, action: string): Promise<void> {
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { status: true, isArchived: true, ownerId: true } });
  if (!property) {
    throw badRequest('Le bien concerné est introuvable.');
  }
  if (property.isArchived) {
    throw badRequest('Ce bien est archivé et ne peut pas faire l\'objet d\'une opération.');
  }
  if (property.status === 'SOLD') {
    throw badRequest(`Impossible de ${action} : ce bien a déjà été vendu.`);
  }
  if (property.status === 'RENTED') {
    throw badRequest(`Impossible de ${action} : ce bien est actuellement loué.`);
  }
  if (property.status === 'RESERVED') {
    throw badRequest(`Impossible de ${action} : ce bien est déjà réservé.`);
  }
  if (property.status === 'UNAVAILABLE') {
    throw badRequest(`Impossible de ${action} : ce bien est actuellement indisponible.`);
  }
  if (!property.ownerId) {
    throw badRequest(`Impossible de ${action} : ce bien n'a pas de propriétaire associé.`);
  }
}

/**
 * Statuts modifiables manuellement depuis le formulaire du bien.
 * RESERVED / SOLD / RENTED résultent exclusivement des opérations métier.
 */
export const MANUAL_PROPERTY_STATUSES = ['AVAILABLE', 'UNAVAILABLE'] as const;

/** Contrôle du statut fourni lors d'une création / modification manuelle. */
export function assertManualPropertyStatus(status: string): void {
  if (!(MANUAL_PROPERTY_STATUSES as readonly string[]).includes(status)) {
    throw badRequest(
      'Les statuts « Réservé », « Vendu » et « Loué » sont attribués automatiquement par les réservations, ventes et contrats de location.',
    );
  }
}

/** Désigne le libellé français d'un statut opérationnel du bien. */
export const operationStatusLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  SOLD: 'Vendu',
  RENTED: 'Loué',
  UNAVAILABLE: 'Indisponible',
};
