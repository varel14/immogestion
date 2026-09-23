import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { logAudit } from '../../utils/audit.js';
import { prisma } from '../../lib/prisma.js';
import { acceptOffer, createOffer, getOfferById, listOffers, refuseOffer, updateOffer } from './offers.service.js';
import { createOfferSchema, listOffersQuerySchema, offerDecisionSchema, updateOfferSchema } from './offers.validators.js';

export const offerRoutes = Router();

offerRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });

/** GET /api/offers — Liste des offres (filtres demande, client, bien, statut). */
offerRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listOffersQuerySchema, req);
    const result = await listOffers(query);
    res.json(result);
  }),
);

/** POST /api/offers — Formulation d'une nouvelle offre d'achat. */
offerRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createOfferSchema, req);
    const offer = await createOffer(req as AuthenticatedRequest, input);
    res.status(201).json({ offer });
  }),
);

/** GET /api/offers/:id — Consultation d'une offre. */
offerRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const offer = await getOfferById(id);
    res.json({ offer });
  }),
);

/** PUT /api/offers/:id — Modification d'une offre en attente. */
offerRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updateOfferSchema, req);
    const offer = await updateOffer(req as AuthenticatedRequest, id, input);
    res.json({ offer });
  }),
);

/** PATCH /api/offers/:id/accept — Acceptation de l'offre. */
offerRoutes.patch(
  '/:id/accept',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(offerDecisionSchema, req);
    const offer = await acceptOffer(req as AuthenticatedRequest, id, input.observations);
    res.json({ offer });
  }),
);

/** PATCH /api/offers/:id/refuse — Refus de l'offre. */
offerRoutes.patch(
  '/:id/refuse',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(offerDecisionSchema, req);
    const offer = await refuseOffer(req as AuthenticatedRequest, id, input.observations);
    res.json({ offer });
  }),
);
