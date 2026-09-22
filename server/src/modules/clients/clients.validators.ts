import { z } from 'zod';

/** Champs communs aux formulaires client.
 *  Pas de catégorie « acheteur / locataire » : un même client pourra
 *  réaliser plusieurs types d'opérations dans les phases suivantes. */
export const clientFieldsSchema = z.object({
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
  notes: z
    .string()
    .trim()
    .max(2000, 'Les notes ne peuvent pas dépasser 2000 caractères.')
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
});

export const createClientSchema = clientFieldsSchema;
export const updateClientSchema = clientFieldsSchema;

export const updateClientStatusSchema = z.object({
  isActive: z.boolean({ message: 'Le statut est obligatoire.' }),
});

export const listClientsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
