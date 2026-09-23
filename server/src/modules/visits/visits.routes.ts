import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import {
  addVisitFeedback,
  createVisit,
  getVisitById,
  listVisits,
  rescheduleVisit,
  updateVisit,
  updateVisitStatus,
} from './visits.service.js';
import {
  createVisitSchema,
  listVisitsQuerySchema,
  rescheduleVisitSchema,
  updateVisitSchema,
  visitStatusSchema,
} from './visits.validators.js';

export const visitRoutes = Router();

visitRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });

/** GET /api/visits — Liste des visites (filtres agent, client, bien, statut, période). */
visitRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listVisitsQuerySchema, req);
    const result = await listVisits(query);
    res.json(result);
  }),
);

/** POST /api/visits — Programmation d'une visite. */
visitRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createVisitSchema, req);
    const visit = await createVisit({ ...input, scheduledAt: new Date(input.scheduledAt) });
    res.status(201).json({ visit });
  }),
);

/** GET /api/visits/:id — Consultation d'une visite. */
visitRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const visit = await getVisitById(id);
    res.json({ visit });
  }),
);

/** PUT /api/visits/:id — Modification d'une visite. */
visitRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updateVisitSchema, req);
    const { scheduledAt, ...rest } = input;
    const visit = await updateVisit(id, {
      ...rest,
      ...(scheduledAt !== undefined ? { scheduledAt: new Date(scheduledAt) } : {}),
    });
    res.json({ visit });
  }),
);

/** PATCH /api/visits/:id/reschedule — Report d'une visite. */
visitRoutes.patch(
  '/:id/reschedule',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(rescheduleVisitSchema, req);
    const visit = await rescheduleVisit(req as AuthenticatedRequest, id, new Date(input.scheduledAt), input.notes);
    res.json({ visit });
  }),
);

/** PATCH /api/visits/:id/status — Effectuée, annulée ou absence du client. */
visitRoutes.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(visitStatusSchema, req);
    const visit = await updateVisitStatus(req as AuthenticatedRequest, id, input.status, input.feedback);
    res.json({ visit });
  }),
);

/** PATCH /api/visits/:id/feedback — Compte rendu et observations du client. */
visitRoutes.patch(
  '/:id/feedback',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const body = z
      .object({
        feedback: z.string().trim().min(1, 'Le compte rendu est obligatoire.'),
        notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
      })
      .parse(req.body);
    const visit = await addVisitFeedback(req as AuthenticatedRequest, id, body.feedback, body.notes);
    res.json({ visit });
  }),
);
