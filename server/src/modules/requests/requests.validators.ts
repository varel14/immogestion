import { z } from 'zod';
import { REQUEST_STATUSES, REQUEST_TYPES } from '../../config/constants.js';

const optionalAmount = z.coerce
  .number({ message: 'Le montant proposé doit être un nombre.' })
  .nonnegative('Le montant proposé doit être positif.')
  .nullish()
  .or(z.literal(''))
  .transform((v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? null : v));

export const createRequestSchema = z.object({
  clientId: z.string().min(1, 'Le client est obligatoire.'),
  propertyId: z.string().min(1, 'Le bien est obligatoire.'),
  type: z.enum(REQUEST_TYPES, { message: 'Type de demande invalide.' }),
  proposedAmount: optionalAmount,
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES, { message: 'Statut invalide.' }),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
});

export const listRequestsQuerySchema = z.object({
  clientId: z.string().optional(),
  propertyId: z.string().optional(),
  type: z.enum(REQUEST_TYPES).optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
