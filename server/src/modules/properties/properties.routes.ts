import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireProperty, uploadDocuments, uploadPhotos } from '../../middleware/upload.js';
import { asyncHandler, parseBody, parseParams, parseQuery } from '../../utils/validate.js';
import {
  createProperty,
  getPropertyById,
  listProperties,
  setPropertyArchived,
  updateProperty,
} from './properties.service.js';
import { addMedia, deleteMedia, getRequestFiles, setPrimaryPhoto } from './media.service.js';
import {
  listPropertiesQuerySchema,
  propertyFieldsSchema,
  updatePropertyArchiveSchema,
} from './properties.validators.js';

export const propertyRoutes = Router();

propertyRoutes.use(authenticate);

const idParamsSchema = z.object({ id: z.string().min(1, 'Identifiant manquant.') });
const mediaIdParamsSchema = z.object({ mediaId: z.string().min(1, 'Identifiant de média manquant.') });

/** GET /api/properties — Liste paginée, recherche et filtres. */
propertyRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listPropertiesQuerySchema, req);
    const result = await listProperties(query);
    res.json(result);
  }),
);

/** POST /api/properties — Création d'un bien (référence générée automatiquement). */
propertyRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(propertyFieldsSchema, req);
    const property = await createProperty(input);
    res.status(201).json({ property });
  }),
);

/** POST /api/properties/:id/photos — Upload de photos (champ « files », multiple). */
propertyRoutes.post(
  '/:id/photos',
  requireProperty,
  uploadPhotos.array('files', 10),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const media = await addMedia(id, 'PHOTO', getRequestFiles(req));
    res.status(201).json({ media });
  }),
);

/** POST /api/properties/:id/documents — Upload de documents (champ « files », multiple). */
propertyRoutes.post(
  '/:id/documents',
  requireProperty,
  uploadDocuments.array('files', 10),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const media = await addMedia(id, 'DOCUMENT', getRequestFiles(req));
    res.status(201).json({ media });
  }),
);

/** PATCH /api/media/:mediaId/primary — Définir la photo principale. */
propertyRoutes.patch(
  '/media/:mediaId/primary',
  asyncHandler(async (req, res) => {
    const { mediaId } = parseParams(mediaIdParamsSchema, req);
    await setPrimaryPhoto(mediaId);
    res.json({ message: 'Photo principale mise à jour.' });
  }),
);

/** DELETE /api/media/:mediaId — Suppression d'un média. */
propertyRoutes.delete(
  '/media/:mediaId',
  asyncHandler(async (req, res) => {
    const { mediaId } = parseParams(mediaIdParamsSchema, req);
    await deleteMedia(mediaId);
    res.json({ message: 'Média supprimé.' });
  }),
);

/** GET /api/properties/:id — Consultation détaillée d'un bien. */
propertyRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const property = await getPropertyById(id);
    res.json({ property });
  }),
);

/** PUT /api/properties/:id — Modification d'un bien. */
propertyRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(propertyFieldsSchema, req);
    const property = await updateProperty(id, input);
    res.json({ property });
  }),
);

/** PATCH /api/properties/:id/archive — Archivage / désarchivage d'un bien. */
propertyRoutes.patch(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const { id } = parseParams(idParamsSchema, req);
    const input = parseBody(updatePropertyArchiveSchema, req);
    await setPropertyArchived(id, input.isArchived);
    res.json({ message: input.isArchived ? 'Bien archivé.' : 'Bien désarchivé.' });
  }),
);
