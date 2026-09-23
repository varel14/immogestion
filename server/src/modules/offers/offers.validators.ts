import { z } from 'zod';
import { OFFER_STATUSES } from '../../config/constants.js';

export const createOfferSchema = z.object({
  requestId: z.string().min(1, 'La demande associée est obligatoire.'),
  amount: z.coerce.number({ message: 'Le montant proposé doit être un nombre.' }).positive('Le montant proposé doit être supérieur à zéro.'),
  observations: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const updateOfferSchema = z.object({
  amount: z.coerce.number({ message: 'Le montant proposé doit être un nombre.' }).positive('Le montant proposé doit être supérieur à zéro.').optional(),
  observations: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
});

export const offerDecisionSchema = z.object({
  observations: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
});

export const listOffersQuerySchema = z.object({
  requestId: z.string().optional(),
  clientId: z.string().optional(),
  propertyId: z.string().optional(),
  status: z.enum(OFFER_STATUSES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
