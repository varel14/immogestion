import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { cancelSale, createSale, finalizeSale, getSaleById, listSales, paySale, updateSale } from './sales.service.js';
import { cancelSaleSchema, createSaleSchema, finalizeSaleSchema, listSalesQuerySchema, updateSaleSchema } from './sales.validators.js';

export const saleRoutes = Router();

saleRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });

const salePaymentSchema = z.object({
  amount: z.coerce.number({ message: 'Le montant doit être un nombre.' }).positive('Le montant doit être supérieur à zéro.'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER'], { message: 'Mode de paiement invalide.' }),
  paymentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de paiement invalide.').optional(),
  transactionReference: z.string().trim().max(100).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

/** GET /api/sales — Liste des ventes (filtres période, agent, client, bien, statut). */
saleRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listSalesQuerySchema, req);
    const result = await listSales(query);
    res.json(result);
  }),
);

/** POST /api/sales — Création d'une vente depuis une demande ou une réservation. */
saleRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createSaleSchema, req);
    const sale = await createSale(req as AuthenticatedRequest, {
      ...input,
      ...(input.saleDate ? { saleDate: input.saleDate } : {}),
    });
    res.status(201).json({ sale });
  }),
);

/** GET /api/sales/:id — Consultation d'une vente avec suivi des paiements. */
saleRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const sale = await getSaleById(id);
    res.json({ sale });
  }),
);

/** PUT /api/sales/:id — Modification d'une vente en cours. */
saleRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updateSaleSchema, req);
    const sale = await updateSale(req as AuthenticatedRequest, id, input);
    res.json({ sale });
  }),
);

/** PATCH /api/sales/:id/finalize — Finalisation de la vente (bien vendu). */
saleRoutes.patch(
  '/:id/finalize',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(finalizeSaleSchema, req);
    const sale = await finalizeSale(req as AuthenticatedRequest, id, input.saleDate);
    res.json({ sale });
  }),
);

/** POST /api/sales/:id/payments — Versement (paiement total ou échelonné). */
saleRoutes.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(salePaymentSchema, req);
    const result = await paySale(req as AuthenticatedRequest, id, input);
    res.status(201).json(result);
  }),
);

/** PATCH /api/sales/:id/cancel — Annulation de la vente. */
saleRoutes.patch(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(cancelSaleSchema, req);
    const sale = await cancelSale(req as AuthenticatedRequest, id, input.reason);
    res.json({ sale });
  }),
);
