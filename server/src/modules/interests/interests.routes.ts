import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { logAudit } from '../../utils/audit.js';
import { createInterest, getInterestById, listInterests, updateInterest } from './interests.service.js';
import { createInterestSchema, listInterestsQuerySchema, updateInterestSchema } from './interests.validators.js';

export const interestRoutes = Router();

interestRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });

/** GET /api/interests — Liste des intérêts (filtres client, bien, type, statut). */
interestRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listInterestsQuerySchema, req);
    const result = await listInterests(query);
    res.json(result);
  }),
);

/** POST /api/interests — Enregistrement de l'intérêt d'un client pour un bien. */
interestRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createInterestSchema, req);
    const interest = await createInterest(input);
    await logAudit(prisma, req as AuthenticatedRequest, {
      action: 'CREATE',
      entityType: 'ClientInterest',
      entityId: interest.id,
      details: `Intérêt ${input.transactionType} enregistré`,
    });
    res.status(201).json({ interest });
  }),
);

/** GET /api/interests/:id — Consultation d'un intérêt. */
interestRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const interest = await getInterestById(id);
    res.json({ interest });
  }),
);

/** PATCH /api/interests/:id — Modification du statut ou des notes. */
interestRoutes.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updateInterestSchema, req);
    const interest = await updateInterest(id, input);
    await logAudit(prisma, req as AuthenticatedRequest, {
      action: 'UPDATE',
      entityType: 'ClientInterest',
      entityId: id,
      details: input.status ? `Statut de l'intérêt : ${input.status}` : 'Notes mises à jour',
    });
    res.json({ interest });
  }),
);
