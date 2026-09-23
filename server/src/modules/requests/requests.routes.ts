import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { logAudit } from '../../utils/audit.js';
import { createRequest, getRequestById, listRequests, updateRequestStatus } from './requests.service.js';
import { createRequestSchema, listRequestsQuerySchema, updateRequestStatusSchema } from './requests.validators.js';

export const requestRoutes = Router();

requestRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });

/** GET /api/requests — Liste des demandes (filtres client, bien, type, statut). */
requestRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listRequestsQuerySchema, req);
    const result = await listRequests(query);
    res.json(result);
  }),
);

/** POST /api/requests — Dépôt d'une demande d'achat ou de location. */
requestRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createRequestSchema, req);
    const request = await createRequest(input);
    await logAudit(prisma, req as AuthenticatedRequest, {
      action: 'CREATE',
      entityType: 'PropertyRequest',
      entityId: request.id,
      details: `Demande de ${input.type === 'PURCHASE' ? 'achat' : 'location'} déposée`,
    });
    res.status(201).json({ request });
  }),
);

/** GET /api/requests/:id — Consultation d'une demande (avec ses offres). */
requestRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const request = await getRequestById(id);
    res.json({ request });
  }),
);

/** PATCH /api/requests/:id/status — Évolution du statut de la demande. */
requestRoutes.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updateRequestStatusSchema, req);
    const request = await updateRequestStatus(id, input.status, input.notes);
    await logAudit(prisma, req as AuthenticatedRequest, {
      action: input.status,
      entityType: 'PropertyRequest',
      entityId: id,
      details: `Statut de la demande : ${input.status}`,
    });
    res.json({ request });
  }),
);
