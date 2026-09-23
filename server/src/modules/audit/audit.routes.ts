import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler, parseQuery } from '../../utils/validate.js';
import { prisma } from '../../lib/prisma.js';

export const auditRoutes = Router();

auditRoutes.use(authenticate);

/** GET /api/audit — Historique des opérations (filtres ressource). */
auditRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(
      z.object({
        entityType: z.string().trim().max(50).optional(),
        entityId: z.string().trim().max(50).optional(),
      }),
      req,
    );

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    res.json({ data: logs });
  }),
);
