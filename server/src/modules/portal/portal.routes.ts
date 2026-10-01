import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { authenticateClient, type ClientRequest } from './portal.middleware.js';
import {
  cancelMyVisit, createVisitRequest, getListing, getMyLease, getMyVisits,
  getPortalProfile, listListings, loginClient, registerClient, updatePortalProfile,
} from './portal.service.js';
import {
  listListingsQuerySchema, portalLoginSchema, portalProfileSchema,
  portalRegisterSchema, visitRequestSchema,
} from './portal.validators.js';

export const portalRoutes = Router();

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });
const visitIdParamsSchema = z.object({ id: z.string().min(1, 'Identifiant de visite manquant.') });

// ─── Routes publiques ────────────────────────────────────────────────────────

/** GET /api/portal/listings — annonces de location disponibles. */
portalRoutes.get(
  '/listings',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listListingsQuerySchema, req);
    res.json(await listListings(query));
  }),
);

/** GET /api/portal/listings/:id — fiche détaillée d'une annonce. */
portalRoutes.get(
  '/listings/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    res.json({ listing: await getListing(id) });
  }),
);

/** POST /api/portal/visit-requests — demande de visite depuis une annonce. */
portalRoutes.post(
  '/visit-requests',
  asyncHandler(async (req, res) => {
    const input = parseBody(visitRequestSchema, req);
    const result = await createVisitRequest(input);
    res.status(201).json(result);
  }),
);

/** POST /api/portal/auth/register — création d'un compte client. */
portalRoutes.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const input = parseBody(portalRegisterSchema, req);
    res.status(201).json(await registerClient(input));
  }),
);

/** POST /api/portal/auth/login — connexion d'un client. */
portalRoutes.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const input = parseBody(portalLoginSchema, req);
    res.json(await loginClient(input));
  }),
);

// ─── Routes du client connecté ───────────────────────────────────────────────

portalRoutes.use('/me', authenticateClient);
portalRoutes.use('/my', authenticateClient);

/** GET /api/portal/me — profil du client connecté. */
portalRoutes.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ client: getPortalProfile(req as ClientRequest) });
  }),
);

/** PUT /api/portal/me — mise à jour du profil. */
portalRoutes.put(
  '/me',
  asyncHandler(async (req, res) => {
    const input = parseBody(portalProfileSchema, req);
    const client = await updatePortalProfile(req as ClientRequest, input);
    res.json({ client });
  }),
);

/** GET /api/portal/my/visits — visites du client. */
portalRoutes.get(
  '/my/visits',
  asyncHandler(async (req, res) => {
    res.json({ data: await getMyVisits(req as ClientRequest) });
  }),
);

/** PATCH /api/portal/my/visits/:id/cancel — annulation d'une visite à venir. */
portalRoutes.patch(
  '/my/visits/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(visitIdParamsSchema, req);
    res.json({ visit: await cancelMyVisit(req as ClientRequest, id) });
  }),
);

/** GET /api/portal/my/lease — logement loué par le client. */
portalRoutes.get(
  '/my/lease',
  asyncHandler(async (req, res) => {
    res.json({ lease: await getMyLease(req as ClientRequest) });
  }),
);
