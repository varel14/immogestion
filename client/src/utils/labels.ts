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
