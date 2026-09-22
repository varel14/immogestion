import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler, parseBody } from '../../utils/validate.js';
import { changePassword, login, updateProfile } from './auth.service.js';
import { changePasswordSchema, loginSchema, updateProfileSchema } from './auth.validators.js';

export const authRoutes = Router();

/** POST /api/auth/login — Connexion d'un utilisateur. */
authRoutes.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = parseBody(loginSchema, req);
    const result = await login(input);
    res.json(result);
  }),
);

// ─── Routes protégées ────────────────────────────────────────────────────────
authRoutes.use(authenticate);

/** GET /api/auth/me — Utilisateur connecté. */
authRoutes.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ user: (req as AuthenticatedRequest).user });
  }),
);

/** PUT /api/auth/profile — Modification du profil. */
authRoutes.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const input = parseBody(updateProfileSchema, req);
    const user = await updateProfile(req as AuthenticatedRequest, input);
    res.json({ user });
  }),
);

/** PUT /api/auth/password — Modification du mot de passe. */
authRoutes.put(
  '/password',
  asyncHandler(async (req, res) => {
    const input = parseBody(changePasswordSchema, req);
    await changePassword(req as AuthenticatedRequest, input);
    res.json({ message: 'Mot de passe modifié avec succès.' });
  }),
);
