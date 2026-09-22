/** Types partagés du domaine — miroir des modèles et enums du backend.
 *  Les tableaux constants alimentent les listes déroulantes du frontend ;
 *  pour ajouter une valeur, mettre à jour le schéma Prisma, les constantes
 *  du serveur et ces tableaux. */

export const ROLES = ['ADMIN', 'AGENT', 'MANAGER'] as const;
export type Role = (typeof ROLES)[number];

export const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'LAND', 'COMMERCIAL', 'OFFICE', 'OTHER'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const TRANSACTION_TYPES = ['SALE', 'RENT', 'SALE_AND_RENT'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PROPERTY_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'UNAVAILABLE'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export type MediaKind = 'PHOTO' | 'DOCUMENT';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  identificationNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  propertiesCount?: number;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  identificationNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyMedia {
  id: string;
  propertyId: string;
  kind: MediaKind;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface PropertyOwnerSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Property {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  transactionType: TransactionType;
  status: PropertyStatus;
  price: number | null;
  rentPrice: number | null;
  address: string | null;
  city: string | null;
  district: string | null;
  surfaceArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ownerId: string | null;
  owner?: PropertyOwnerSummary | null;
  isArchived: boolean;
  media?: PropertyMedia[];
  /** photo principale (utilisé dans les listes) */
  primaryPhotoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface DashboardStats {
  totalProperties: number;
  availableProperties: number;
  reservedProperties: number;
  forSaleCount: number;
  forRentCount: number;
  ownersCount: number;
  activeClientsCount: number;
  totalClientsCount: number;
  recentProperties: Property[];
}
