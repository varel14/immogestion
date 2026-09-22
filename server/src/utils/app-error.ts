/**
 * Erreur applicative explicite : le message est destiné à l'utilisateur
 * final et doit donc être rédigé en français.
 */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const badRequest = (message: string) => new AppError(400, message);
export const unauthorized = (message = 'Session invalide ou expirée. Veuillez vous reconnecter.') =>
  new AppError(401, message);
export const forbidden = (message = "Vous n'avez pas les droits nécessaires pour effectuer cette action.") =>
  new AppError(403, message);
export const notFound = (message = 'Ressource introuvable.') => new AppError(404, message);
export const conflict = (message: string) => new AppError(409, message);
