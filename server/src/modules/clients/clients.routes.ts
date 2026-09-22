import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import {
  createClient,
  getClientById,
  listClients,
  updateClient,
  updateClientStatus,
} from './clients.service.js';
import { createClientSchema, listClientsQuerySchema, updateClientStatusSchema } from './clients.validators.js';

export const clientRoutes = Router();

clientRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });

/** GET /api/clients — Liste paginée, recherche et filtre de statut. */
clientRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listClientsQuerySchema, req);
    const result = await listClients(query);
    res.json(result);
  }),
);

/** POST /api/clients — Création d'un client. */
clientRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createClientSchema, req);
    const client = await createClient(input);
    res.status(201).json({ client });
  }),
);

/** GET /api/clients/:id — Consultation d'un client. */
clientRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const client = await getClientById(id);
    res.json({ client });
  }),
);

/** PUT /api/clients/:id — Modification d'un client. */
clientRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(createClientSchema, req);
    const client = await updateClient(id, input);
    res.json({ client });
  }),
);

/** PATCH /api/clients/:id/status — Archivage / restauration d'un client. */
clientRoutes.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updateClientStatusSchema, req);
    const client = await updateClientStatus(id, input.isActive);
    res.json({ client });
  }),
);
