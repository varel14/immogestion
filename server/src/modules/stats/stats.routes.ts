import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/validate.js';
import { getDashboardStats } from './stats.service.js';

export const statsRoutes = Router();

statsRoutes.use(authenticate);

/** GET /api/stats/dashboard — Indicateurs du tableau d'accueil. */
statsRoutes.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const stats = await getDashboardStats();
    res.json(stats);
  }),
);
