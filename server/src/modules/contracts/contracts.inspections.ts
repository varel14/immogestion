import fs from 'node:fs';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { getUploadRoot } from '../../middleware/upload.js';
import { logAudit } from '../../utils/audit.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import type { CreateInspectionInput } from './contracts.validators.js';

/**
 * Enregistrement d'un état des lieux (entrée ou sortie) pour un contrat.
 * Les observations détaillées et photos sont ajoutées ensuite item par item.
 */
export async function createInspection(
  req: AuthenticatedRequest,
  contractId: string,
  input: CreateInspectionInput,
) {
  const contract = await prisma.rentalContract.findUnique({ where: { id: contractId }, select: { id: true, reference: true } });
  if (!contract) throw notFound('Contrat de location introuvable.');

  // Un seul état des lieux par type et par contrat.
  const existing = await prisma.propertyInspection.findFirst({
    where: { contractId, type: input.type },
    select: { id: true },
  });
  if (existing) {
    throw badRequest(
      input.type === 'ENTRY'
        ? "Un état des lieux d'entrée existe déjà pour ce contrat."
        : "Un état des lieux de sortie existe déjà pour ce contrat.",
    );
  }

  const inspection = await prisma.propertyInspection.create({
    data: {
      contractId,
      type: input.type,
      inspectionDate: new Date(input.inspectionDate),
      generalObservations: input.generalObservations,
      condition: input.condition,
      inspectorId: input.inspectorId,
    },
    include: {
      items: true,
      inspector: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await logAudit(prisma, req, {
    action: 'CREATE',
    entityType: 'PropertyInspection',
    entityId: inspection.id,
    details: `État des lieux ${input.type === 'ENTRY' ? "d'entrée" : 'de sortie'} du bail ${contract.reference}`,
  });
  return inspection;
}

/** Ajout d'une observation détaillée, éventuellement avec photo. */
export async function addInspectionItem(
  req: AuthenticatedRequest,
  inspectionId: string,
  observation: string,
  file?: Express.Multer.File,
) {
  const inspection = await prisma.propertyInspection.findUnique({ where: { id: inspectionId }, select: { id: true } });
  if (!inspection) throw notFound("État des lieux introuvable.");

  const item = await prisma.inspectionItem.create({
    data: {
      inspectionId,
      observation,
      photoUrl: file ? `/uploads/${file.filename}` : null,
    },
  });

  await logAudit(prisma, req, {
    action: 'UPDATE',
    entityType: 'PropertyInspection',
    entityId: inspectionId,
    details: `Observation ajoutée${file ? ' avec photo' : ''}`,
  });
  return item;
}

/** Suppression d'une observation (et de sa photo éventuelle). */
export async function deleteInspectionItem(req: AuthenticatedRequest, itemId: string) {
  const item = await prisma.inspectionItem.findUnique({ where: { id: itemId } });
  if (!item) throw notFound('Observation introuvable.');

  await prisma.inspectionItem.delete({ where: { id: itemId } });
  if (item.photoUrl) {
    const filePath = path.join(getUploadRoot(), path.basename(item.photoUrl));
    fs.promises.unlink(filePath).catch(() => undefined);
  }
}

/** Purge les photos d'un état des lieux supprimé en cascade. */
export async function cleanupInspectionPhotos(inspectionId: string): Promise<void> {
  const items = await prisma.inspectionItem.findMany({ where: { inspectionId }, select: { photoUrl: true } });
  for (const item of items) {
    if (item.photoUrl) {
      const filePath = path.join(getUploadRoot(), path.basename(item.photoUrl));
      fs.promises.unlink(filePath).catch(() => undefined);
    }
  }
}

export type InspectionWithItems = Prisma.PropertyInspectionGetPayload<{
  include: { items: true; inspector: { select: { id: true; firstName: true; lastName: true } } };
}>;
