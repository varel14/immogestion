import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.'),
  lastName: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ().-]{6,20}$/, 'Numéro de téléphone invalide.')
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est obligatoire.'),
    newPassword: z
      .string()
      .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.')
      .max(72, 'Le nouveau mot de passe ne peut pas dépasser 72 caractères.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
