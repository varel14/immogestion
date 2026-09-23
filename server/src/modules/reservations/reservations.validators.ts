import { z } from 'zod';

export const createReservationSchema = z.object({
  sourceType: z.enum(['REQUEST', 'OFFER'], { message: 'Source de réservation invalide.' }),
  sourceId: z.string().min(1, 'La source (demande ou offre) est obligatoire.'),
  expiresAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date d'expiration invalide.")
    .optional(),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const listReservationsQuerySchema = z.object({
  clientId: z.string().optional(),
  propertyId: z.string().optional(),
  status: z
    .enum(['ACTIVE', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'CONVERTED'])
    .optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
