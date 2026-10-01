import axios from 'axios';
import { getClientToken } from './portal-session.js';
import type { PaginationMeta, PropertyStatus, PropertyType, VisitStatus, InvoiceStatus, LeaseStatus } from '../types/index.js';

// Instance dédiée au portail : elle transporte le token du client connecté
// (et non celui, distinct, des employés de l'agence).
const portalHttp = axios.create({ baseURL: '/api' });

portalHttp.interceptors.request.use((config) => {
  const token = getClientToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Types du portail public ─────────────────────────────────────────────────

export interface ListingPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface PortalListing {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  rentPrice: number | null;
  address: string | null;
  city: string | null;
  district: string | null;
  surfaceArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  createdAt: string;
  photos: ListingPhoto[];
}

export interface ListingsQuery {
  q?: string;
  city?: string;
  type?: PropertyType;
  minBedrooms?: number;
  maxRent?: number;
  page?: number;
  pageSize?: number;
}

export interface PortalClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface PortalVisit {
  id: string;
  scheduledAt: string;
  status: VisitStatus;
  notes: string | null;
  agent: { firstName: string; lastName: string } | null;
  property: {
    id: string;
    title: string;
    city: string | null;
    district: string | null;
    propertyType: PropertyType;
    photoUrl: string | null;
  };
}

export interface LeaseInvoice {
  id: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  receipt: { reference: string; issuedAt: string } | null;
}

export interface PortalLease {
  id: string;
  reference: string;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  paymentDay: number;
  signedAt: string | null;
  owner: { firstName: string; lastName: string; phone: string | null; email: string | null };
  property: {
    id: string;
    reference: string;
    title: string;
    description: string | null;
    propertyType: PropertyType;
    address: string | null;
    city: string | null;
    district: string | null;
    surfaceArea: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    status: PropertyStatus;
    photos: ListingPhoto[];
  };
  invoices: LeaseInvoice[];
}

export interface VisitRequestInput {
  propertyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  message?: string | null;
}

// ─── Appels API ──────────────────────────────────────────────────────────────

export const portalApi = {
  async listings(query: ListingsQuery, signal?: AbortSignal): Promise<{ data: PortalListing[]; pagination: PaginationMeta }> {
    const { data } = await portalHttp.get('/portal/listings', { params: query, signal });
    return data;
  },

  async listing(id: string, signal?: AbortSignal): Promise<PortalListing> {
    const { data } = await portalHttp.get(`/portal/listings/${id}`, { signal });
    return data.listing;
  },

  async requestVisit(input: VisitRequestInput): Promise<{ visit: { id: string; scheduledAt: string; property: { title: string; city: string | null } } }> {
    const { data } = await portalHttp.post('/portal/visit-requests', input);
    return data;
  },

  async register(input: { firstName: string; lastName: string; email: string; phone: string; password: string }): Promise<{ token: string; client: PortalClient }> {
    const { data } = await portalHttp.post('/portal/auth/register', input);
    return data;
  },

  async login(email: string, password: string): Promise<{ token: string; client: PortalClient }> {
    const { data } = await portalHttp.post('/portal/auth/login', { email, password });
    return data;
  },

  async me(signal?: AbortSignal): Promise<PortalClient> {
    const { data } = await portalHttp.get('/portal/me', { signal });
    return data.client;
  },

  async myVisits(signal?: AbortSignal): Promise<PortalVisit[]> {
    const { data } = await portalHttp.get('/portal/my/visits', { signal });
    return data.data;
  },

  async cancelVisit(id: string): Promise<void> {
    await portalHttp.patch(`/portal/my/visits/${id}/cancel`);
  },

  async myLease(signal?: AbortSignal): Promise<PortalLease | null> {
    const { data } = await portalHttp.get('/portal/my/lease', { signal });
    return data.lease;
  },
};
