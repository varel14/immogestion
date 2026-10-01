import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { forbidden, unauthorized } from '../../utils/app-error.js';

export interface ClientRequest extends Request {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
}

/**
 * Vérifie le token JWT du portail client (scope « client » — distinct des
 * sessions des employés de l'agence), charge la fiche client et s'assure
 * que le compte dispose bien d'un mot de passe et est actif.
 */
export async function authenticateClient(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized();
    }

    let payload: { sub?: string; scope?: string };
    try {
      payload = jwt.verify(header.slice(7), env.jwtSecret) as { sub?: string; scope?: string };
    } catch {
      throw unauthorized();
    }

    if (payload.scope !== 'client' || !payload.sub) {
      throw unauthorized();
    }

    const client = await prisma.client.findUnique({ where: { id: payload.sub } });
    if (!client || !client.passwordHash) {
      throw unauthorized("Le compte client associé à cette session n'existe plus.");
    }
    if (!client.isActive) {
      throw forbidden('Votre compte est désactivé. Contactez l\'agence.');
    }

    (req as ClientRequest).client = {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email ?? '',
      phone: client.phone,
    };
    next();
  } catch (error) {
    next(error);
  }
}
