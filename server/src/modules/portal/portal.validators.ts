import { z } from 'zod';
import { PROPERTY_TYPES } from '../../config/constants.js';

/** Recherche et pagination des annonces publiques. */
export const listListingsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  minBedrooms: z.coerce.number().int().min(0).max(20).optional(),
  maxRent: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(48).optional(),
});

export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;

const email = z.string().trim().toLowerCase().email('Adresse email invalide.');

/** Demande de visite déposée depuis la fiche d'une annonce. */
export const visitRequestSchema = z.object({
  propertyId: z.string().min(1, 'Bien manquant.'),
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.').max(80),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.').max(80),
  email,
  phone: z.string().trim().min(6, 'Le numéro de téléphone est obligatoire.').max(30),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de visite invalide.'),
  preferredTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Heure de visite invalide.'),
  message: z.string().trim().max(1000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export type VisitRequestInput = z.infer<typeof visitRequestSchema>;

/** Création d'un compte sur le portail (ou adoption d'une fiche client existante). */
export const portalRegisterSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.').max(80),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.').max(80),
  email,
  phone: z.string().trim().min(6, 'Le numéro de téléphone est obligatoire.').max(30),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.').max(100),
});

export type PortalRegisterInput = z.infer<typeof portalRegisterSchema>;

export const portalLoginSchema = z.object({
  email,
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

export type PortalLoginInput = z.infer<typeof portalLoginSchema>;

/** Mise à jour du profil par le client connecté. */
export const portalProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est obligatoire.').max(80),
  lastName: z.string().trim().min(1, 'Le nom est obligatoire.').max(80),
  phone: z.string().trim().max(30).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export type PortalProfileInput = z.infer<typeof portalProfileSchema>;
