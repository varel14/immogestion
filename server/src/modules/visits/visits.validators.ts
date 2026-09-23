import { z } from 'zod';
import { VISIT_STATUSES } from '../../config/constants.js';

const isoDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date invalide.');

export const createVisitSchema = z.object({
  propertyId: z.string().min(1, 'Le bien est obligatoire.'),
  clientId: z.string().min(1, 'Le client est obligatoire.'),
  agentId: z.string().min(1, "L'agent est obligatoire."),
  interestId: z.string().nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  scheduledAt: isoDateTime,
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const updateVisitSchema = z.object({
  propertyId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  agentId: z.string().min(1).optional(),
  scheduledAt: isoDateTime.optional(),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
});

export const rescheduleVisitSchema = z.object({
  scheduledAt: isoDateTime,
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
});

export const visitStatusSchema = z.object({
  status: z.enum(['COMPLETED', 'CANCELLED', 'NO_SHOW'], { message: 'Statut invalide.' }),
  feedback: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)).optional(),
});

export const listVisitsQuerySchema = z.object({
  agentId: z.string().optional(),
  clientId: z.string().optional(),
  propertyId: z.string().optional(),
  status: z.enum(VISIT_STATUSES).optional(),
  from: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de début invalide.').optional(),
  to: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de fin invalide.').optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type ListVisitsQuery = z.infer<typeof listVisitsQuerySchema>;
