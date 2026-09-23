import type { Prisma } from '@prisma/client';
import type { AuthenticatedRequest } from '../middleware/auth.js';

type Db = Prisma.TransactionClient;

interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}

/**
 * Enregistre une entrée du journal d'audit : qui, quand, sur quoi, quoi.
 * À appeler pour les opérations métier importantes (offres, réservations,
 * ventes, contrats, paiements...).
 */
export async function logAudit(
  db: Db,
  req: AuthenticatedRequest,
  entry: AuditEntry,
): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: req.user.id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details ?? null,
    },
  });
}
