import { api } from './client.js';
import type {
  ClientInterest, InterestStatus, InterestTransactionType,
  Paginated, PropertyRequest, PurchaseOffer, Reservation,
  RequestStatus, RequestType, PersonSummary, PropertySummary, Visit,
} from '../types/index.js';

// ─── Intérêts ────────────────────────────────────────────────────────────────

export interface ListInterestsParams {
  clientId?: string;
  propertyId?: string;
  transactionType?: InterestTransactionType;
  status?: InterestStatus;
  page?: number;
  pageSize?: number;
}

export const interestsApi = {
  async list(params: ListInterestsParams): Promise<Paginated<ClientInterest>> {
    const { data } = await api.get<Paginated<ClientInterest>>('/interests', { params });
    return data;
  },
  async create(input: { clientId: string; propertyId: string; transactionType: InterestTransactionType; notes?: string | null }): Promise<ClientInterest> {
    const { data } = await api.post<{ interest: ClientInterest }>('/interests', input);
    return data.interest;
  },
  async update(id: string, input: { status?: InterestStatus; notes?: string | null }): Promise<ClientInterest> {
    const { data } = await api.patch<{ interest: ClientInterest }>(`/interests/${id}`, input);
    return data.interest;
  },
};

// ─── Visites ─────────────────────────────────────────────────────────────────

export interface ListVisitsParams {
  agentId?: string;
  clientId?: string;
  propertyId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface VisitInput {
  propertyId: string;
  clientId: string;
  agentId: string;
  interestId?: string | null;
  scheduledAt: string;
  notes?: string | null;
}

export const visitsApi = {
  async list(params: ListVisitsParams): Promise<Paginated<Visit>> {
    const { data } = await api.get<Paginated<Visit>>('/visits', { params });
    return data;
  },
  async getById(id: string): Promise<Visit> {
    const { data } = await api.get<{ visit: Visit }>(`/visits/${id}`);
    return data.visit;
  },
  async create(input: VisitInput): Promise<Visit> {
    const { data } = await api.post<{ visit: Visit }>('/visits', input);
    return data.visit;
  },
  async update(id: string, input: Partial<VisitInput>): Promise<Visit> {
    const { data } = await api.put<{ visit: Visit }>(`/visits/${id}`, input);
    return data.visit;
  },
  async reschedule(id: string, scheduledAt: string, notes?: string | null): Promise<Visit> {
    const { data } = await api.patch<{ visit: Visit }>(`/visits/${id}/reschedule`, { scheduledAt, notes });
    return data.visit;
  },
  async setStatus(id: string, status: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW', feedback?: string | null): Promise<Visit> {
    const { data } = await api.patch<{ visit: Visit }>(`/visits/${id}/status`, { status, feedback });
    return data.visit;
  },
  async addFeedback(id: string, feedback: string, notes?: string | null): Promise<Visit> {
    const { data } = await api.patch<{ visit: Visit }>(`/visits/${id}/feedback`, { feedback, notes });
    return data.visit;
  },
};

// ─── Demandes ────────────────────────────────────────────────────────────────

export interface ListRequestsParams {
  clientId?: string;
  propertyId?: string;
  type?: RequestType;
  status?: RequestStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const requestsApi = {
  async list(params: ListRequestsParams): Promise<Paginated<PropertyRequest>> {
    const { data } = await api.get<Paginated<PropertyRequest>>('/requests', { params });
    return data;
  },
  async getById(id: string): Promise<PropertyRequest> {
    const { data } = await api.get<{ request: PropertyRequest }>(`/requests/${id}`);
    return data.request;
  },
  async create(input: { clientId: string; propertyId: string; type: RequestType; proposedAmount?: number | null; notes?: string | null }): Promise<PropertyRequest> {
    const { data } = await api.post<{ request: PropertyRequest }>('/requests', input);
    return data.request;
  },
  async updateStatus(id: string, status: RequestStatus, notes?: string | null): Promise<PropertyRequest> {
    const { data } = await api.patch<{ request: PropertyRequest }>(`/requests/${id}/status`, { status, notes });
    return data.request;
  },
};

// ─── Offres ──────────────────────────────────────────────────────────────────

export interface ListOffersParams {
  requestId?: string;
  clientId?: string;
  propertyId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const offersApi = {
  async list(params: ListOffersParams): Promise<Paginated<PurchaseOffer>> {
    const { data } = await api.get<Paginated<PurchaseOffer>>('/offers', { params });
    return data;
  },
  async create(input: { requestId: string; amount: number; observations?: string | null }): Promise<PurchaseOffer> {
    const { data } = await api.post<{ offer: PurchaseOffer }>('/offers', input);
    return data.offer;
  },
  async update(id: string, input: { amount?: number; observations?: string | null }): Promise<PurchaseOffer> {
    const { data } = await api.put<{ offer: PurchaseOffer }>(`/offers/${id}`, input);
    return data.offer;
  },
  async accept(id: string, observations?: string | null): Promise<PurchaseOffer> {
    const { data } = await api.patch<{ offer: PurchaseOffer }>(`/offers/${id}/accept`, { observations });
    return data.offer;
  },
  async refuse(id: string, observations?: string | null): Promise<PurchaseOffer> {
    const { data } = await api.patch<{ offer: PurchaseOffer }>(`/offers/${id}/refuse`, { observations });
    return data.offer;
  },
};

// ─── Réservations ────────────────────────────────────────────────────────────

export interface ListReservationsParams {
  clientId?: string;
  propertyId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const reservationsApi = {
  async list(params: ListReservationsParams): Promise<Paginated<Reservation>> {
    const { data } = await api.get<Paginated<Reservation>>('/reservations', { params });
    return data;
  },
  async getById(id: string): Promise<Reservation> {
    const { data } = await api.get<{ reservation: Reservation }>(`/reservations/${id}`);
    return data.reservation;
  },
  async create(input: { sourceType: 'REQUEST' | 'OFFER'; sourceId: string; expiresAt?: string; notes?: string | null }): Promise<Reservation> {
    const { data } = await api.post<{ reservation: Reservation }>('/reservations', input);
    return data.reservation;
  },
  async confirm(id: string): Promise<Reservation> {
    const { data } = await api.patch<{ reservation: Reservation }>(`/reservations/${id}/confirm`);
    return data.reservation;
  },
  async cancel(id: string, reason?: string | null): Promise<Reservation> {
    const { data } = await api.patch<{ reservation: Reservation }>(`/reservations/${id}/cancel`, { reason });
    return data.reservation;
  },
};

// ─── Helpers communs pour les listes de référence ────────────────────────────

export const referenceApi = {
  async clients(): Promise<PersonSummary[]> {
    const { data } = await api.get<Paginated<PersonSummary & { isActive?: boolean }>>('/clients', { params: { pageSize: 100, isActive: 'true' } });
    return data.data.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone }));
  },
  async properties(): Promise<PropertySummary[]> {
    const { data } = await api.get<Paginated<PropertySummary>>('/properties', { params: { pageSize: 100 } });
    return data.data.map((p) => ({ id: p.id, reference: p.reference, title: p.title, city: p.city, status: p.status }));
  },
  async agents(): Promise<PersonSummary[]> {
    const { data } = await api.get<Paginated<PersonSummary>>('/users', { params: { pageSize: 100, isActive: 'true' } });
    return data.data.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName }));
  },
  async owners(): Promise<PersonSummary[]> {
    const { data } = await api.get<Paginated<PersonSummary>>('/owners', { params: { pageSize: 100 } });
    return data.data.map((o) => ({ id: o.id, firstName: o.firstName, lastName: o.lastName }));
  },
};
