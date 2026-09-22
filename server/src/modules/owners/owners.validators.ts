import { z } from 'zod';

export const ownerFieldsSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.').max(50),
  lastName: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(50),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ().-]{6,20}$/, 'Numéro de téléphone invalide.')
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Adresse email invalide.')
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  address: z.string().trim().max(255).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  identificationNumber: z
    .string()
    .trim()
    .max(50, "Le numéro d'identification ne peut pas dépasser 50 caractères.")
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  notes: z.string().trim().max(2000, 'Les notes ne peuvent pas dépasser 2000 caractères.').nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const createOwnerSchema = ownerFieldsSchema;

export const updateOwnerSchema = ownerFieldsSchema;

export const listOwnersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>;
export type ListOwnersQuery = z.infer<typeof listOwnersQuerySchema>;
