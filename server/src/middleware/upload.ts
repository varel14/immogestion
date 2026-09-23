import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { DOCUMENT_EXTENSIONS, PHOTO_MIME_TYPES } from '../config/constants.js';
import { badRequest, notFound } from '../utils/app-error.js';
import { prisma } from '../lib/prisma.js';

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
fs.mkdirSync(uploadRoot, { recursive: true });

export const getUploadRoot = () => uploadRoot;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

function makeUploader(allowedMimes: string[] | null, allowedExtensions: string[] | null) {
  return multer({
    storage,
    limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const mimeOk = !allowedMimes || allowedMimes.includes(file.mimetype);
      const extOk = !allowedExtensions || allowedExtensions.includes(ext);
      if (mimeOk && extOk) {
        cb(null, true);
      } else {
        cb(badRequest('Type de fichier non autorisé.'));
      }
    },
  });
}

/** Upload de photos uniquement (images). */
export const uploadPhotos = makeUploader(PHOTO_MIME_TYPES, null);

/** Upload de documents (pdf, bureautique, images). */
export const uploadDocuments = makeUploader(null, DOCUMENT_EXTENSIONS);

/** Upload de photos pour les états des lieux. */
export const uploadInspectionPhotos = makeUploader(PHOTO_MIME_TYPES, null);

/** Vérifie la présence d'un fichier après passage par multer. */
export function requireFiles(req: Request, _res: Response, next: NextFunction): void {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    next(badRequest('Aucun fichier reçu. Veuillez sélectionner au moins un fichier.'));
    return;
  }
  next();
}

/** Vérifie que le bien référencé dans la route existe. */
export async function requireProperty(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const property = id ? await prisma.property.findUnique({ where: { id }, select: { id: true } }) : null;
    if (!property) {
      next(notFound('Bien introuvable.'));
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
