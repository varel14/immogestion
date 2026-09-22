import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { createOwner, getOwnerById, getOwnerProperties, listOwners, updateOwner } from './owners.service.js';
import { createOwnerSchema, listOwnersQuerySchema } from './owners.validators.js';

export const ownerRoutes = Router();

// Consultation et gestion des propriétaires : tout utilisateur actif.
ownerRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });

/** GET /api/owners — Liste paginée avec recherche. */
ownerRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listOwnersQuerySchema, req);
    const result = await listOwners(query);
    res.json(result);
  }),
);

/** POST /api/owners — Création d'un propriétaire. */
ownerRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createOwnerSchema, req);
    const owner = await createOwner(input);
    res.status(201).json({ owner });
  }),
);

/** GET /api/owners/:id — Consultation d'un propriétaire. */
ownerRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const owner = await getOwnerById(id);
    res.json({ owner });
  }),
);

/** GET /api/owners/:id/properties — Biens appartenant au propriétaire. */
ownerRoutes.get(
  '/:id/properties',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const properties = await getOwnerProperties(id);
    res.json({ data: properties });
  }),
);

/** PUT /api/owners/:id — Modification d'un propriétaire. */
ownerRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(createOwnerSchema, req);
    const owner = await updateOwner(id, input);
    res.json({ owner });
  }),
);
