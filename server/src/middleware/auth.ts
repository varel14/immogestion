import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../utils/app-error.js';
import { toPublicUser } from '../utils/serializers.js';
import type { Role } from '../config/constants.js';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: Role;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Vérifie le token JWT Bearer, charge l'utilisateur correspondant et
 * s'assure que son compte est actif. L'utilisateur est rechargé à chaque
 * requête afin que les changements de rôle ou de statut s'appliquent immédiatement.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized();
    }

    let payload: { sub?: string };
    try {
      payload = jwt.verify(header.slice(7), env.jwtSecret) as { sub?: string };
    } catch {
      throw unauthorized();
    }

    const user = payload.sub
      ? await prisma.user.findUnique({ where: { id: payload.sub } })
      : null;

    if (!user) {
      throw unauthorized("L'utilisateur associé à cette session n'existe plus.");
    }
    if (!user.isActive) {
      throw forbidden('Votre compte est désactivé. Contactez un administrateur.');
    }

    (req as AuthenticatedRequest).user = toPublicUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Restreint l'accès aux rôles fournis. Sans argument, tout utilisateur
 * authentifié et actif est accepté.
 */
export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (roles.length > 0 && !roles.includes(user.role)) {
      return next(forbidden());
    }
    next();
  };
}
