import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { uploadInspectionPhotos } from '../../middleware/upload.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import { addInspectionItem, createInspection, deleteInspectionItem } from './contracts.inspections.js';
import { buildReceiptPdf, createReceipt, getInvoiceById, listInvoices, listReceipts, payInvoice } from './contracts.invoices.js';
import {
  activateContract,
  cancelContract,
  createContract,
  getContractById,
  listContracts,
  renewContract,
  terminateContract,
} from './contracts.service.js';
import {
  createContractSchema,
  createInspectionSchema,
  listContractsQuerySchema,
  listInvoicesQuerySchema,
  renewContractSchema,
  terminateContractSchema,
} from './contracts.validators.js';

export const contractRoutes = Router();

contractRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });
const contractIdParamsSchema = z.object({ contractId: z.string().min(1, 'Identifiant de contrat manquant.') });
const inspectionIdParamsSchema = z.object({ inspectionId: z.string().min(1, "Identifiant d'état des lieux manquant.") });
const invoiceIdParamsSchema = z.object({ invoiceId: z.string().min(1, "Identifiant d'échéance manquant.") });

const paymentSchema = z.object({
  amount: z.coerce.number({ message: 'Le montant doit être un nombre.' }).positive('Le montant doit être supérieur à zéro.'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER'], { message: 'Mode de paiement invalide.' }),
  paymentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date de paiement invalide.').optional(),
  transactionReference: z.string().trim().max(100).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  notes: z.string().trim().max(2000).nullish().or(z.literal('')).transform((v) => (v ? v : null)),
});

/** GET /api/contracts — Liste des contrats (filtres locataire, propriétaire, bien, statut). */
contractRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listContractsQuerySchema, req);
    const result = await listContracts(query);
    res.json(result);
  }),
);

/** POST /api/contracts — Création d'un bail depuis une demande ou une réservation. */
contractRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(createContractSchema, req);
    const contract = await createContract(req as AuthenticatedRequest, input);
    res.status(201).json({ contract });
  }),
);

// ─── Quittances (routes littérales avant /:id) ───────────────────────────────

/** GET /api/contracts/receipts — Liste des quittances émises. */
contractRoutes.get(
  '/receipts',
  asyncHandler(async (req, res) => {
    const result = await listReceipts({
      contractId: typeof req.query.contractId === 'string' ? req.query.contractId : undefined,
      page: typeof req.query.page === 'string' ? Number(req.query.page) : undefined,
      pageSize: typeof req.query.pageSize === 'string' ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  }),
);

/** GET /api/contracts/receipts/:id/download — Téléchargement du PDF de quittance. */
contractRoutes.get(
  '/receipts/:id/download',
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const { fileName, pdf } = await buildReceiptPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdf);
  }),
);

// ─── Échéances de loyer ──────────────────────────────────────────────────────

/** GET /api/contracts/invoices — Échéances (filtres contrat, statut). */
contractRoutes.get(
  '/invoices',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listInvoicesQuerySchema, req);
    const result = await listInvoices(query);
    res.json(result);
  }),
);

/** GET /api/contracts/invoices/:invoiceId — Détail d'une échéance avec paiements. */
contractRoutes.get(
  '/invoices/:invoiceId',
  asyncHandler(async (req, res) => {
    const { invoiceId } = parseParams(invoiceIdParamsSchema, req);
    const invoice = await getInvoiceById(invoiceId);
    res.json({ invoice });
  }),
);

/** POST /api/contracts/invoices/:invoiceId/payments — Paiement total ou partiel d'un loyer. */
contractRoutes.post(
  '/invoices/:invoiceId/payments',
  asyncHandler(async (req, res) => {
    const { invoiceId } = parseParams(invoiceIdParamsSchema, req);
    const input = parseBody(paymentSchema, req);
    const result = await payInvoice(req as AuthenticatedRequest, invoiceId, input);
    res.status(201).json(result);
  }),
);

/** POST /api/contracts/invoices/:invoiceId/receipt — Génération de la quittance. */
contractRoutes.post(
  '/invoices/:invoiceId/receipt',
  asyncHandler(async (req, res) => {
    const { invoiceId } = parseParams(invoiceIdParamsSchema, req);
    const receipt = await createReceipt(req as AuthenticatedRequest, invoiceId);
    res.status(201).json({ receipt });
  }),
);

// ─── États des lieux ─────────────────────────────────────────────────────────

/** POST /api/contracts/inspections/:inspectionId/items — Observation (photo optionnelle). */
contractRoutes.post(
  '/inspections/:inspectionId/items',
  uploadInspectionPhotos.single('photo'),
  asyncHandler(async (req, res) => {
    const { inspectionId } = parseParams(inspectionIdParamsSchema, req);
    const observation = z
      .string()
      .trim()
      .min(1, "L'observation est obligatoire.")
      .max(1000)
      .parse(req.body.observation);
    const item = await addInspectionItem(req as AuthenticatedRequest, inspectionId, observation, req.file);
    res.status(201).json({ item });
  }),
);

/** DELETE /api/contracts/inspections/items/:itemId — Suppression d'une observation. */
contractRoutes.delete(
  '/inspections/items/:itemId',
  asyncHandler(async (req, res) => {
    const itemId = z.string().min(1).parse(req.params.itemId);
    await deleteInspectionItem(req as AuthenticatedRequest, itemId);
    res.json({ message: 'Observation supprimée.' });
  }),
);

/** POST /api/contracts/:contractId/inspections — Création d'un état des lieux. */
contractRoutes.post(
  '/:contractId/inspections',
  asyncHandler(async (req, res) => {
    const { contractId } = parseParams(contractIdParamsSchema, req);
    const input = parseBody(createInspectionSchema, req);
    const inspection = await createInspection(req as AuthenticatedRequest, contractId, input);
    res.status(201).json({ inspection });
  }),
);

/** GET /api/contracts/:id — Détail complet (inspections, échéances, paiements). */
contractRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const contract = await getContractById(id);
    res.json({ contract });
  }),
);

/** PATCH /api/contracts/:id/activate — Activation du bail (bien loué + échéances). */
contractRoutes.patch(
  '/:id/activate',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const contract = await activateContract(req as AuthenticatedRequest, id);
    res.json({ contract });
  }),
);

/** PATCH /api/contracts/:id/terminate — Résiliation du bail. */
contractRoutes.patch(
  '/:id/terminate',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(terminateContractSchema, req);
    const contract = await terminateContract(req as AuthenticatedRequest, id, input.notes);
    res.json({ contract });
  }),
);

/** PATCH /api/contracts/:id/renew — Renouvellement du bail. */
contractRoutes.patch(
  '/:id/renew',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(renewContractSchema, req);
    const contract = await renewContract(req as AuthenticatedRequest, id, new Date(input.newEndDate));
    res.json({ contract });
  }),
);

/** PATCH /api/contracts/:id/cancel — Annulation d'un bail en brouillon. */
contractRoutes.patch(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const contract = await cancelContract(req as AuthenticatedRequest, id);
    res.json({ contract });
  }),
);
