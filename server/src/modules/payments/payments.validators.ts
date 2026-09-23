import { z } from 'zod';
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from '../../config/constants.js';

export const createPaymentSchema = z.object({
  clientId: z.string().min(1, 'Le client est obligatoire.'),
  amount: z.coerce.number({ message: 'Le montant doit être un nombre.' }).positive('Le montant doit être supérieur à zéro.'),
  paymentType: z.enum(['DEPOSIT', 'OTHER'], { message: 'Pour un paiement de vente ou de loyer, utilisez le flux dédié.' }),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Mode de paiement invalide.' }),
  paymentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de paiement invalide.'),
  transactionReference: z.string().trim().max(100).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const listPaymentsQuerySchema = z.object({
  clientId: z.string().optional(),
  paymentType: z.enum(PAYMENT_TYPES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  saleId: z.string().optional(),
  contractId: z.string().optional(),
  from: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de début invalide.').optional(),
  to: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de fin invalide.').optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
