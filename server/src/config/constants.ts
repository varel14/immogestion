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

// ─── Phase 2 : intérêts, visites, demandes, offres, réservations ─────────────

export const INTEREST_TRANSACTION_TYPES = ['SALE', 'RENT'] as const;
export type InterestTransactionType = (typeof INTEREST_TRANSACTION_TYPES)[number];

export const INTEREST_STATUSES = ['NEW', 'CONTACTED', 'VISIT_PLANNED', 'NEGOTIATING', 'DROPPED', 'CONVERTED'] as const;
export type InterestStatus = (typeof INTEREST_STATUSES)[number];

export const VISIT_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const REQUEST_TYPES = ['PURCHASE', 'RENTAL'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = ['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REFUSED', 'CANCELLED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const OFFER_STATUSES = ['PENDING', 'ACCEPTED', 'REFUSED', 'WITHDRAWN'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const RESERVATION_SOURCE_TYPES = ['REQUEST', 'OFFER'] as const;
export type ReservationSourceType = (typeof RESERVATION_SOURCE_TYPES)[number];

export const RESERVATION_STATUSES = ['ACTIVE', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'CONVERTED'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

// ─── Phase 3 : ventes, contrats, échéances, paiements ────────────────────────

export const SALE_STATUSES = ['PREPARATION', 'IN_PROGRESS', 'FINALIZED', 'CANCELLED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const LEASE_STATUSES = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED'] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const INSPECTION_TYPES = ['ENTRY', 'EXIT'] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const INVOICE_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_TYPES = ['SALE', 'RENT', 'DEPOSIT', 'OTHER'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Informations de l'agence figurant sur les quittances. */
export const AGENCY_INFO = {
  name: 'ImmoGestion',
  address: 'Immeuble ImmoGestion, Avenue de la République',
  city: 'Dakar',
  phone: '+221 33 800 00 00',
  email: 'contact@immogestion.fr',
};

