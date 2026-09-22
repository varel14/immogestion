import { Router } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { forbidden } from '../../utils/app-error.js';
import { createUser, getUserById, listUsers, updateUser, updateUserStatus } from './users.service.js';
import { createUserSchema, listUsersQuerySchema, updateUserSchema, updateUserStatusSchema } from './users.validators.js';

export const userRoutes = Router();

// Toutes les routes utilisateurs sont réservées aux administrateurs.
userRoutes.use(authenticate, requireRoles('ADMIN'));

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });

/** GET /api/users — Liste paginée, recherche et filtres (rôle, statut). */
userRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listUsersQuerySchema, req);
    const result = await listUsers(query);
    res.json(result);
  }),
);

/** GET /api/users/:id — Consultation d'un utilisateur. */
userRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const user = await getUserById(id);
    res.json({ user });
  }),
);

/** POST /api/users — Création d'un utilisateur. */
userRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createUserSchema, req);
    const user = await createUser(input);
    res.status(201).json({ user });
  }),
);

/** PUT /api/users/:id — Modification (infos, rôle, statut, mot de passe). */
userRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updateUserSchema, req);
    const user = await updateUser(id, input);
    res.json({ user });
  }),
);

/** PATCH /api/users/:id/status — Désactivation / réactivation. */
userRoutes.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updateUserStatusSchema, req);
    const current = (req as AuthenticatedRequest).user;
    if (current.id === id && !input.isActive) {
      throw forbidden('Vous ne pouvez pas désactiver votre propre compte.');
    }
    const user = await updateUserStatus(id, input.isActive);
    res.json({ user });
  }),
);
