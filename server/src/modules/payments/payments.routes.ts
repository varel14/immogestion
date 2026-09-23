import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { cancelPayment, createManualPayment, getPaymentById, listPayments } from './payments.service.js';
import { createPaymentSchema, listPaymentsQuerySchema } from './payments.validators.js';

export const paymentRoutes = Router();

paymentRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });
const cancelSchema = z.object({
  reason: z.string().trim().max(500).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

/** GET /api/payments — Liste des paiements (filtres période, client, type, méthode, statut). */
paymentRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listPaymentsQuerySchema, req);
    const result = await listPayments(query);
    res.json(result);
  }),
);

/** POST /api/payments — Enregistrement manuel d'un paiement (caution, autres frais). */
paymentRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createPaymentSchema, req);
    const payment = await createManualPayment(req as AuthenticatedRequest, input);
    res.status(201).json({ payment });
  }),
);

/** GET /api/payments/:id — Consultation d'un paiement. */
paymentRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const payment = await getPaymentById(id);
    res.json({ payment });
  }),
);

/** PATCH /api/payments/:id/cancel — Annulation d'un paiement (historique conservé). */
paymentRoutes.patch(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(cancelSchema, req);
    const payment = await cancelPayment(req as AuthenticatedRequest, id, input.reason);
    res.json({ payment });
  }),
);
