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
  visitsScheduled: number;
  visitsToday: number;
  pendingRequests: number;
  upcomingVisits: {
    id: string;
    scheduledAt: string;
    status: VisitStatus;
    property: { id: string; reference: string; title: string };
    client: { id: string; firstName: string; lastName: string };
    agent: { id: string; firstName: string; lastName: string };
  }[];
  soldProperties: number;
  rentedProperties: number;
  salesInProgress: number;
  salesFinalized: number;
  activeContracts: number;
  rentsExpectedThisMonth: number;
  rentsCollectedThisMonth: number;
  overdueInvoicesCount: number;
  overdueAmount: number;
}

// ─── Phase 2 : intérêts, visites, demandes, offres, réservations ─────────────

export const INTEREST_TRANSACTION_TYPES = ['SALE', 'RENT'] as const;
export type InterestTransactionType = (typeof INTEREST_TRANSACTION_TYPES)[number];

export const INTEREST_STATUSES = ['NEW', 'CONTACTED', 'VISIT_PLANNED', 'NEGOTIATING', 'DROPPED', 'CONVERTED'] as const;
export type InterestStatus = (typeof INTEREST_STATUSES)[number];

export interface ClientInterest {
  id: string;
  clientId: string;
  propertyId: string;
  transactionType: InterestTransactionType;
  status: InterestStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client?: PersonSummary;
  property?: PropertySummary;
}

export const VISIT_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export interface Visit {
  id: string;
  propertyId: string;
  clientId: string;
  agentId: string;
  interestId: string | null;
  scheduledAt: string;
  status: VisitStatus;
  notes: string | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
  property?: PropertySummary;
  client?: PersonSummary;
  agent?: PersonSummary;
}

export const REQUEST_TYPES = ['PURCHASE', 'RENTAL'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = ['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REFUSED', 'CANCELLED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const OFFER_STATUSES = ['PENDING', 'ACCEPTED', 'REFUSED', 'WITHDRAWN'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export interface PurchaseOffer {
  id: string;
  requestId: string;
  clientId: string;
  propertyId: string;
  amount: number;
  status: OfferStatus;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  client?: PersonSummary;
  property?: PropertySummary;
  request?: { id: string; type: RequestType; status: RequestStatus; proposedAmount: number | null };
}

export interface PropertyRequest {
  id: string;
  clientId: string;
  propertyId: string;
  type: RequestType;
  status: RequestStatus;
  proposedAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client?: PersonSummary;
  property?: PropertySummary;
  offers?: PurchaseOffer[];
  offersCount?: number;
}

export const RESERVATION_STATUSES = ['ACTIVE', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'CONVERTED'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type ReservationSourceType = 'REQUEST' | 'OFFER';

export interface Reservation {
  id: string;
  clientId: string;
  propertyId: string;
  sourceType: ReservationSourceType;
  sourceId: string;
  reservedAt: string;
  expiresAt: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  client?: PersonSummary;
  property?: PropertySummary;
}

// ─── Phase 3 : ventes, contrats, inspections, échéances, paiements ───────────

export const SALE_STATUSES = ['PREPARATION', 'IN_PROGRESS', 'FINALIZED', 'CANCELLED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export interface Sale {
  id: string;
  reference: string;
  propertyId: string;
  buyerId: string;
  ownerId: string;
  agentId: string;
  salePrice: number;
  status: SaleStatus;
  saleDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  property?: PropertySummary;
  buyer?: PersonSummary;
  owner?: PersonSummary;
  agent?: PersonSummary;
  paidAmount?: number;
  remainingAmount?: number;
  payments?: Payment[];
}

export const LEASE_STATUSES = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED'] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const INSPECTION_TYPES = ['ENTRY', 'EXIT'] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export interface InspectionItem {
  id: string;
  inspectionId: string;
  observation: string;
  photoUrl: string | null;
  createdAt: string;
}

export interface PropertyInspection {
  id: string;
  contractId: string;
  type: InspectionType;
  inspectionDate: string;
  generalObservations: string | null;
  condition: string | null;
  inspectorId: string | null;
  inspector?: PersonSummary | null;
  items?: InspectionItem[];
  createdAt: string;
}

export const INVOICE_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface RentInvoice {
  id: string;
  contractId: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  remainingAmount?: number;
  status: InvoiceStatus;
  createdAt: string;
  contract?: { id: string; reference: string; monthlyRent: number | null; tenant?: PersonSummary; property?: { id: string; reference: string; title: string; city: string }; owner?: PersonSummary };
  payments?: Payment[];
  receipt?: { id: string; reference: string; issuedAt?: string } | null;
}

export interface RentalContract {
  id: string;
  reference: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  paymentDay: number;
  status: LeaseStatus;
  signedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  property?: PropertySummary;
  tenant?: PersonSummary;
  owner?: PersonSummary;
  inspections?: PropertyInspection[];
  invoices?: RentInvoice[];
  payments?: Payment[];
  invoicesCount?: number;
  inspectionsCount?: number;
}

export interface Receipt {
  id: string;
  reference: string;
  invoiceId: string;
  issuedAt: string;
  periodLabel: string;
  amount: number;
  paymentDate: string;
  invoice?: { contract?: { reference: string; tenant?: PersonSummary; owner?: PersonSummary; property?: { title: string; city: string } } };
}

export const PAYMENT_TYPES = ['SALE', 'RENT', 'DEPOSIT', 'OTHER'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Payment {
  id: string;
  reference: string;
  clientId: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  status: PaymentStatus;
  transactionReference: string | null;
  notes: string | null;
  saleId: string | null;
  invoiceId: string | null;
  contractId: string | null;
  createdAt: string;
  updatedAt: string;
  client?: PersonSummary;
  sale?: { id: string; reference: string } | null;
  invoice?: { id: string; dueDate: string; contract?: { id: string; reference: string } } | null;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: string;
}

export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

export interface PropertySummary {
  id: string;
  reference: string;
  title: string;
  city?: string | null;
  status?: PropertyStatus;
  price?: number | null;
  rentPrice?: number | null;
  primaryPhotoUrl?: string | null;
}
