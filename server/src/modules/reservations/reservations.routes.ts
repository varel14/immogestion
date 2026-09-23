import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import {
  cancelReservation,
  confirmReservation,
  createReservation,
  getReservationById,
  listReservations,
} from './reservations.service.js';
import { createReservationSchema, listReservationsQuerySchema } from './reservations.validators.js';

export const reservationRoutes = Router();

reservationRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });
const cancelSchema = z.object({
  reason: z.string().trim().max(500).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

/** GET /api/reservations — Liste des réservations (filtres client, bien, statut). */
reservationRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listReservationsQuerySchema, req);
    const result = await listReservations(query);
    res.json(result);
  }),
);

/** POST /api/reservations — Réservation depuis une demande ou une offre acceptée. */
reservationRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createReservationSchema, req);
    const reservation = await createReservation(req as AuthenticatedRequest, input);
    res.status(201).json({ reservation });
  }),
);

/** GET /api/reservations/:id — Consultation d'une réservation. */
reservationRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const reservation = await getReservationById(id);
    res.json({ reservation });
  }),
);

/** PATCH /api/reservations/:id/confirm — Confirmation de la réservation. */
reservationRoutes.patch(
  '/:id/confirm',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const reservation = await confirmReservation(req as AuthenticatedRequest, id);
    res.json({ reservation });
  }),
);

/** PATCH /api/reservations/:id/cancel — Annulation de la réservation. */
reservationRoutes.patch(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(cancelSchema, req);
    const reservation = await cancelReservation(req as AuthenticatedRequest, id, input.reason);
    res.json({ reservation });
  }),
);
