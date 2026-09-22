import { z } from 'zod';
import { ROLES } from '../../config/constants.js';

const phoneField = z
  .string()
  .trim()
  .regex(/^[+0-9 ().-]{6,20}$/, 'Numéro de téléphone invalide.')
  .nullish()
  .or(z.literal(''))
  .transform((v) => (v ? v : null));

export const createUserSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.').max(50),
  lastName: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(50),
  email: z.string().trim().toLowerCase().email('Adresse email invalide.'),
  phone: phoneField,
  role: z.enum(ROLES, { message: 'Rôle invalide.' }),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
    .max(72, 'Le mot de passe ne peut pas dépasser 72 caractères.'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.').max(50),
  lastName: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(50),
  email: z.string().trim().toLowerCase().email('Adresse email invalide.'),
  phone: phoneField,
  role: z.enum(ROLES, { message: 'Rôle invalide.' }),
  isActive: z.boolean(),
  password: z
    .string()
    .max(72)
    .refine((v) => v === '' || v.length >= 8, {
      message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
    })
    .optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ message: 'Le statut est obligatoire.' }),
});

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(ROLES, { message: 'Rôle invalide.' }).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
