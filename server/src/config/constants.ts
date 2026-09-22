/**
 * Constantes métier centralisées.
 * Les valeurs correspondent aux enums Prisma ; pour ajouter une valeur
 * (nouveau rôle, nouveau type de bien...), mettre à jour l'enum dans
 * prisma/schema.prisma ET ce fichier.
 */

export const ROLES = ['ADMIN', 'AGENT', 'MANAGER'] as const;
export type Role = (typeof ROLES)[number];

export const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'LAND', 'COMMERCIAL', 'OFFICE', 'OTHER'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const TRANSACTION_TYPES = ['SALE', 'RENT', 'SALE_AND_RENT'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PROPERTY_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'UNAVAILABLE'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const MEDIA_KINDS = ['PHOTO', 'DOCUMENT'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Types MIME autorisés pour les photos */
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Extensions autorisées pour les documents */
export const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpeg', '.jpg', '.png', '.webp'];
