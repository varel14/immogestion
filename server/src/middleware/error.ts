import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/app-error.js';
import { env } from '../config/env.js';

/** 404 pour toute route inconnue. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Route introuvable : ${req.method} ${req.path}` });
};

/** Gestion centralisée des erreurs : messages français, pas de fuite interne. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  // Erreurs de validation Zod (parsing direct dans les services)
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const message = first
      ? first.path.length > 0
        ? `Champ « ${first.path.join('.')} » : ${first.message}`
        : first.message
      : 'Données invalides.';
    res.status(422).json({ message });
    return;
  }

  // Contrainte d'unicité Prisma (email, référence...)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const fields = Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(', ') : 'champ';
      res.status(409).json({ message: `La valeur du champ « ${fields} » est déjà utilisée.` });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Ressource introuvable.' });
      return;
    }
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error('[Erreur non gérée]', error);
  res.status(500).json({
    message:
      env.nodeEnv === 'production'
        ? 'Une erreur interne est survenue. Veuillez réessayer plus tard.'
        : `Erreur interne : ${error instanceof Error ? error.message : String(error)}`,
  });
};
