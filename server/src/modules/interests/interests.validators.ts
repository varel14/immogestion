import { z } from 'zod';
import { INTEREST_STATUSES, INTEREST_TRANSACTION_TYPES } from '../../config/constants.js';

export const createInterestSchema = z.object({
  clientId: z.string().min(1, 'Le client est obligatoire.'),
  propertyId: z.string().min(1, 'Le bien est obligatoire.'),
  transactionType: z.enum(INTEREST_TRANSACTION_TYPES, { message: 'Type de transaction invalide.' }),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const updateInterestSchema = z.object({
  status: z.enum(INTEREST_STATUSES, { message: 'Statut invalide.' }).optional(),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
});

export const listInterestsQuerySchema = z.object({
  clientId: z.string().optional(),
  propertyId: z.string().optional(),
  transactionType: z.enum(INTEREST_TRANSACTION_TYPES).optional(),
  status: z.enum(INTEREST_STATUSES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateInterestInput = z.infer<typeof createInterestSchema>;
export type UpdateInterestInput = z.infer<typeof updateInterestSchema>;
export type ListInterestsQuery = z.infer<typeof listInterestsQuerySchema>;
