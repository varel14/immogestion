import { z } from 'zod';
import { INSPECTION_TYPES, LEASE_STATUSES } from '../../config/constants.js';

const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date invalide.');

export const createContractSchema = z.object({
  sourceType: z.enum(['REQUEST', 'RESERVATION'], { message: 'Source de contrat invalide.' }),
  sourceId: z.string().min(1, 'La source (demande ou réservation) est obligatoire.'),
  startDate: isoDate,
  endDate: isoDate,
  monthlyRent: z.coerce.number({ message: 'Le loyer mensuel doit être un nombre.' }).positive('Le loyer mensuel doit être supérieur à zéro.').optional(),
  depositAmount: z.coerce.number({ message: 'La caution doit être un nombre.' }).nonnegative('La caution doit être positive.').optional(),
  paymentDay: z.coerce.number({ message: "Le jour d'échéance doit être un nombre." }).int().min(1, "Le jour d'échéance est compris entre 1 et 28.").max(28, "Le jour d'échéance est compris entre 1 et 28.").optional(),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const renewContractSchema = z.object({
  newEndDate: isoDate,
});

export const terminateContractSchema = z.object({
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const listContractsQuerySchema = z.object({
  propertyId: z.string().optional(),
  tenantId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(LEASE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const createInspectionSchema = z.object({
  type: z.enum(INSPECTION_TYPES, { message: "Type d'état des lieux invalide." }),
  inspectionDate: isoDate,
  generalObservations: z.string().trim().max(3000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  condition: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  inspectorId: z.string().nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const listInvoicesQuerySchema = z.object({
  contractId: z.string().optional(),
  ownerId: z.string().optional(),
  tenantId: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;
export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
