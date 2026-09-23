import type { PropertyStatus, PropertyType, Role, TransactionType } from '../types/index.js';

/** Libellés français des énumérations du domaine. */

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrateur',
  AGENT: 'Agent',
  MANAGER: 'Responsable',
};

export const propertyTypeLabels: Record<PropertyType, string> = {
  HOUSE: 'Maison',
  APARTMENT: 'Appartement',
  LAND: 'Terrain',
  COMMERCIAL: 'Local commercial',
  OFFICE: 'Bureau',
  OTHER: 'Autre',
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: 'Vente',
  RENT: 'Location',
  SALE_AND_RENT: 'Vente / Location',
};

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  SOLD: 'Vendu',
  RENTED: 'Loué',
  UNAVAILABLE: 'Indisponible',
};

/** Classes Tailwind des badges de statut de bien. */
export const propertyStatusBadgeClass: Record<PropertyStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  RESERVED: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  SOLD: 'bg-slate-200 text-slate-700 ring-slate-500/20',
  RENTED: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  UNAVAILABLE: 'bg-red-100 text-red-700 ring-red-600/20',
};

/** Classes Tailwind des badges de rôle. */
export const roleBadgeClass: Record<Role, string> = {
  ADMIN: 'bg-violet-100 text-violet-700 ring-violet-600/20',
  MANAGER: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  AGENT: 'bg-blue-100 text-blue-700 ring-blue-600/20',
};

/** Options des filtres de type de transaction. */
export const transactionFilterOptions = [
  { value: 'SALE', label: 'Vente' },
  { value: 'RENT', label: 'Location' },
  { value: 'SALE_AND_RENT', label: 'Vente / Location' },
];

// ─── Libellés Phase 2 et 3 ───────────────────────────────────────────────────

import type {
  InterestStatus, InterestTransactionType, InvoiceStatus, LeaseStatus,
  OfferStatus, PaymentMethod, PaymentStatus, PaymentType, RequestStatus,
  RequestType, ReservationStatus, SaleStatus, VisitStatus, InspectionType,
} from '../types/index.js';

export const interestTransactionLabels: Record<InterestTransactionType, string> = {
  SALE: 'Achat',
  RENT: 'Location',
};

export const interestStatusLabels: Record<InterestStatus, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  VISIT_PLANNED: 'Visite planifiée',
  NEGOTIATING: 'En négociation',
  DROPPED: 'Abandonné',
  CONVERTED: 'Converti',
};

export const interestStatusBadgeClass: Record<InterestStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  CONTACTED: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  VISIT_PLANNED: 'bg-cyan-100 text-cyan-700 ring-cyan-600/20',
  NEGOTIATING: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  DROPPED: 'bg-slate-200 text-slate-600 ring-slate-500/20',
  CONVERTED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
};

export const visitStatusLabels: Record<VisitStatus, string> = {
  SCHEDULED: 'Programmée',
  COMPLETED: 'Effectuée',
  CANCELLED: 'Annulée',
  RESCHEDULED: 'Reportée',
  NO_SHOW: 'Absence client',
};

export const visitStatusBadgeClass: Record<VisitStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-slate-200 text-slate-600 ring-slate-500/20',
  RESCHEDULED: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  NO_SHOW: 'bg-red-100 text-red-700 ring-red-600/20',
};

export const requestTypeLabels: Record<RequestType, string> = {
  PURCHASE: 'Achat',
  RENTAL: 'Location',
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  PENDING: 'En attente',
  UNDER_REVIEW: "En cours d'étude",
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  CANCELLED: 'Annulée',
};

export const requestStatusBadgeClass: Record<RequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  REFUSED: 'bg-red-100 text-red-700 ring-red-600/20',
  CANCELLED: 'bg-slate-200 text-slate-600 ring-slate-500/20',
};

export const offerStatusLabels: Record<OfferStatus, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  WITHDRAWN: 'Retirée',
};

export const offerStatusBadgeClass: Record<OfferStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  REFUSED: 'bg-red-100 text-red-700 ring-red-600/20',
  WITHDRAWN: 'bg-slate-200 text-slate-600 ring-slate-500/20',
};

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  ACTIVE: 'Active',
  CONFIRMED: 'Confirmée',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
  CONVERTED: 'Transformée',
};

export const reservationStatusBadgeClass: Record<ReservationStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  EXPIRED: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  CANCELLED: 'bg-slate-200 text-slate-600 ring-slate-500/20',
  CONVERTED: 'bg-violet-100 text-violet-700 ring-violet-600/20',
};

export const saleStatusLabels: Record<SaleStatus, string> = {
  PREPARATION: 'Préparation',
  IN_PROGRESS: 'En cours',
  FINALIZED: 'Finalisée',
  CANCELLED: 'Annulée',
};

export const saleStatusBadgeClass: Record<SaleStatus, string> = {
  PREPARATION: 'bg-slate-200 text-slate-700 ring-slate-500/20',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  FINALIZED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-red-100 text-red-700 ring-red-600/20',
};

export const leaseStatusLabels: Record<LeaseStatus, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  EXPIRED: 'Arrivé à échéance',
  TERMINATED: 'Résilié',
  CANCELLED: 'Annulé',
};

export const leaseStatusBadgeClass: Record<LeaseStatus, string> = {
  DRAFT: 'bg-slate-200 text-slate-700 ring-slate-500/20',
  ACTIVE: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  EXPIRED: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  TERMINATED: 'bg-orange-100 text-orange-700 ring-orange-600/20',
  CANCELLED: 'bg-red-100 text-red-700 ring-red-600/20',
};

export const inspectionTypeLabels: Record<InspectionType, string> = {
  ENTRY: "État des lieux d'entrée",
  EXIT: 'État des lieux de sortie',
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  PENDING: 'En attente',
  PARTIALLY_PAID: 'Partiellement payé',
  PAID: 'Payé',
  OVERDUE: 'En retard',
};

export const invoiceStatusBadgeClass: Record<InvoiceStatus, string> = {
  PENDING: 'bg-slate-200 text-slate-700 ring-slate-500/20',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  PAID: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  OVERDUE: 'bg-red-100 text-red-700 ring-red-600/20',
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  SALE: 'Vente',
  RENT: 'Loyer',
  DEPOSIT: 'Caution',
  OTHER: 'Autre',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  MOBILE_MONEY: 'Mobile Money',
  OTHER: 'Autre',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Validé',
  CANCELLED: 'Annulé',
};

export const paymentStatusBadgeClass: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-red-100 text-red-700 ring-red-600/20',
};

/** Libellés français des actions du journal d'audit. */
export const auditActionLabels: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  CANCEL: 'Annulation',
  ACCEPT: 'Acceptation',
  REFUSE: 'Refus',
  FINALIZE: 'Finalisation',
  ACTIVATE: 'Activation',
  TERMINATE: 'Résiliation',
  RENEW: 'Renouvellement',
  PAY: 'Paiement',
  RESCHEDULE: 'Report',
  COMPLETED: 'Visite effectuée',
  NO_SHOW: 'Absence constatée',
  CONFIRM: 'Confirmation',
  FEEDBACK: 'Compte rendu',
};
