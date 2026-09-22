import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/app-error.js';
import { getUploadRoot } from '../../middleware/upload.js';
import type { MediaKind } from '../../config/constants.js';
import type { Request } from 'express';

interface UploadedFileInfo {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
}

/** Ajoute plusieurs médias (photos ou documents) à un bien.
 *  La première photo devient photo principale si le bien n'en a pas encore. */
export async function addMedia(propertyId: string, kind: MediaKind, files: UploadedFileInfo[]) {
  const hasPrimary = await prisma.propertyMedia.findFirst({
    where: { propertyId, kind: 'PHOTO', isPrimary: true },
    select: { id: true },
  });
  const firstIsPrimary = kind === 'PHOTO' && !hasPrimary;

  const records = await prisma.$transaction(
    files.map((file, index) =>
      prisma.propertyMedia.create({
        data: {
          propertyId,
          kind,
          url: `/uploads/${file.filename}`,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          isPrimary: firstIsPrimary && index === 0,
        },
      }),
    ),
  );

  return records;
}

/** Supprime un média (fichier disque + enregistrement).
 *  Si la photo principale est supprimée, la plus ancienne photo restante
 *  devient la nouvelle photo principale. */
export async function deleteMedia(mediaId: string) {
  const media = await prisma.propertyMedia.findUnique({ where: { id: mediaId } });
  if (!media) {
    throw notFound('Média introuvable.');
  }

  await prisma.propertyMedia.delete({ where: { id: mediaId } });

  // Suppression du fichier sur disque (échec non bloquant)
  const filePath = path.join(getUploadRoot(), path.basename(media.url));
  fs.promises.unlink(filePath).catch(() => undefined);

  if (media.isPrimary && media.kind === 'PHOTO') {
    const next = await prisma.propertyMedia.findFirst({
      where: { propertyId: media.propertyId, kind: 'PHOTO' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (next) {
      await prisma.propertyMedia.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }
}

/** Définit la photo principale d'un bien. */
export async function setPrimaryPhoto(mediaId: string) {
  const media = await prisma.propertyMedia.findUnique({ where: { id: mediaId } });
  if (!media) {
    throw notFound('Média introuvable.');
  }
  if (media.kind !== 'PHOTO') {
    throw badRequest('Seule une photo peut être définie comme photo principale.');
  }

  await prisma.$transaction([
    prisma.propertyMedia.updateMany({
      where: { propertyId: media.propertyId, kind: 'PHOTO', isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.propertyMedia.update({ where: { id: mediaId }, data: { isPrimary: true } }),
  ]);
}

/** Extrait les fichiers de la requête multipart (champ « files »). */
export function getRequestFiles(req: Request): UploadedFileInfo[] {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    throw badRequest('Aucun fichier reçu. Veuillez sélectionner au moins un fichier.');
  }
  return files;
}
