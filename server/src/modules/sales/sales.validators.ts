import { z } from 'zod';
import { SALE_STATUSES } from '../../config/constants.js';

const optionalDate = z
  .string()
  .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Date invalide.')
  .nullish()
  .transform((v) => (v ? v : null));

export const createSaleSchema = z.object({
  sourceType: z.enum(['REQUEST', 'RESERVATION'], { message: 'Source de vente invalide.' }),
  sourceId: z.string().min(1, 'La source (demande ou réservation) est obligatoire.'),
  agentId: z.string().min(1, "L'agent responsable est obligatoire."),
  salePrice: z.coerce.number({ message: 'Le prix de vente doit être un nombre.' }).positive('Le prix de vente doit être supérieur à zéro.').optional(),
  saleDate: optionalDate,
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const updateSaleSchema = z.object({
  agentId: z.string().min(1).optional(),
  salePrice: z.coerce.number({ message: 'Le prix de vente doit être un nombre.' }).positive('Le prix de vente doit être supérieur à zéro.').optional(),
  saleDate: optionalDate,
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
  status: z.enum(SALE_STATUSES).optional(),
});

export const finalizeSaleSchema = z.object({
  saleDate: optionalDate,
});

export const cancelSaleSchema = z.object({
  reason: z.string().trim().max(500).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const listSalesQuerySchema = z.object({
  propertyId: z.string().optional(),
  buyerId: z.string().optional(),
  agentId: z.string().optional(),
  status: z.enum(SALE_STATUSES).optional(),
  from: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de début invalide.').optional(),
  to: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de fin invalide.').optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
