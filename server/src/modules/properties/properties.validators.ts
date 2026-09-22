import { z } from 'zod';
import { PROPERTY_STATUSES, PROPERTY_TYPES, TRANSACTION_TYPES } from '../../config/constants.js';

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} ne peut pas dépasser ${max} caractères.`).nullish().or(z.literal('')).transform((v) => (v ? v : null));

const optionalNumber = (label: string) =>
  z.coerce
    .number({ message: `${label} doit être un nombre.` })
    .nonnegative(`${label} doit être positif.`)
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? null : v));

const optionalInt = (label: string) =>
  z.coerce
    .number({ message: `${label} doit être un nombre.` })
    .int(`${label} doit être un nombre entier.`)
    .min(0, `${label} doit être positif.`)
    .nullish()
    .or(z.literal(''))
    .transform((v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? null : Math.trunc(v)));

export const propertyFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Le titre doit contenir au moins 3 caractères.')
    .max(150, 'Le titre ne peut pas dépasser 150 caractères.'),
  description: optionalText(5000, 'La description'),
  propertyType: z.enum(PROPERTY_TYPES, { message: 'Type de bien invalide.' }),
  transactionType: z.enum(TRANSACTION_TYPES, { message: 'Type de transaction invalide.' }),
  status: z.enum(PROPERTY_STATUSES, { message: 'Statut invalide.' }).default('AVAILABLE'),
  price: optionalNumber('Le prix de vente'),
  rentPrice: optionalNumber('Le loyer mensuel'),
  address: optionalText(255, "L'adresse"),
  city: optionalText(100, 'La ville'),
  district: optionalText(100, 'Le quartier'),
  surfaceArea: optionalNumber('La surface'),
  bedrooms: optionalInt('Le nombre de chambres'),
  bathrooms: optionalInt('Le nombre de salles de bain'),
  ownerId: z.string().trim().nullish().or(z.literal('')).transform((v) => (v ? v : null)),
})
  // Cohérence transaction / prix : une vente exige un prix de vente,
  // une location exige un loyer mensuel.
  .refine((data) => data.price !== null || !['SALE', 'SALE_AND_RENT'].includes(data.transactionType), {
    message: 'Le prix de vente est obligatoire pour une vente.',
    path: ['price'],
  })
  .refine((data) => data.rentPrice !== null || !['RENT', 'SALE_AND_RENT'].includes(data.transactionType), {
    message: 'Le loyer mensuel est obligatoire pour une location.',
    path: ['rentPrice'],
  });

export const updatePropertySchema = propertyFieldsSchema;

export const updatePropertyArchiveSchema = z.object({
  isArchived: z.boolean({ message: "La valeur d'archivage est obligatoire." }),
});

export const listPropertiesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  propertyType: z.enum(PROPERTY_TYPES, { message: 'Type de bien invalide.' }).optional(),
  transactionType: z.enum(TRANSACTION_TYPES, { message: 'Type de transaction invalide.' }).optional(),
  status: z.enum(PROPERTY_STATUSES, { message: 'Statut invalide.' }).optional(),
  city: z.string().trim().max(100).optional(),
  ownerId: z.string().trim().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  isArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreatePropertyInput = z.infer<typeof propertyFieldsSchema>;
export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>;
