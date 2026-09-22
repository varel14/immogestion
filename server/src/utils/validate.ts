import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { badRequest } from './app-error.js';

/** Traduit une ZodError en message français lisible. */
export function formatZodError(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Données invalides.';
  const path = first.path.join('.');
  return path ? `Champ « ${path} » : ${first.message}` : first.message;
}

export function parseWith<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(formatZodError(result.error));
  }
  return result.data;
}

/** Analyse et valide le corps de la requête avec le schéma fourni. */
export function parseBody<T>(schema: ZodType<T>, req: Request): T {
  return parseWith(schema, req.body);
}

/** Analyse et valide les paramètres d'URL (req.query) avec le schéma fourni. */
export function parseQuery<T>(schema: ZodType<T>, req: Request): T {
  return parseWith(schema, req.query);
}

/** Analyse et valide un paramètre de route (req.params). */
export function parseParams<T>(schema: ZodType<T>, req: Request): T {
  return parseWith(schema, req.params);
}

/** Enrobe un gestionnaire asynchrone (Express 5 relaie déjà les rejets,
 *  ce wrapper sert surtout à uniformiser la signature). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
