import { api } from './client.js';
import type {
  AuditLogEntry, Paginated, Payment, PropertyInspection,
  Receipt, RentInvoice, RentalContract, Sale,
} from '../types/index.js';

// ─── Ventes ──────────────────────────────────────────────────────────────────

export interface ListSalesParams {
  propertyId?: string;
  buyerId?: string;
  agentId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const salesApi = {
  async list(params: ListSalesParams): Promise<Paginated<Sale>> {
    const { data } = await api.get<Paginated<Sale>>('/sales', { params });
    return data;
  },
  async getById(id: string): Promise<Sale> {
    const { data } = await api.get<{ sale: Sale }>(`/sales/${id}`);
    return data.sale;
  },
  async create(input: { sourceType: 'REQUEST' | 'RESERVATION'; sourceId: string; agentId: string; salePrice?: number; saleDate?: string | null; notes?: string | null }): Promise<Sale> {
    const { data } = await api.post<{ sale: Sale }>('/sales', input);
    return data.sale;
  },
  async update(id: string, input: { agentId?: string; salePrice?: number; saleDate?: string | null; notes?: string | null; status?: string }): Promise<Sale> {
    const { data } = await api.put<{ sale: Sale }>(`/sales/${id}`, input);
    return data.sale;
  },
  async finalize(id: string, saleDate?: string | null): Promise<Sale> {
    const { data } = await api.patch<{ sale: Sale }>(`/sales/${id}/finalize`, { saleDate });
    return data.sale;
  },
  async cancel(id: string, reason?: string | null): Promise<Sale> {
    const { data } = await api.patch<{ sale: Sale }>(`/sales/${id}/cancel`, { reason });
    return data.sale;
  },
  async pay(id: string, input: { amount: number; paymentMethod: string; paymentDate?: string; transactionReference?: string | null; notes?: string | null }): Promise<{ payment: Payment; paidAmount: number; remainingAmount: number }> {
    const { data } = await api.post(`/sales/${id}/payments`, input);
    return data;
  },
};

// ─── Contrats de location ────────────────────────────────────────────────────

export interface ListContractsParams {
  propertyId?: string;
  tenantId?: string;
  ownerId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const contractsApi = {
  async list(params: ListContractsParams): Promise<Paginated<RentalContract>> {
    const { data } = await api.get<Paginated<RentalContract>>('/contracts', { params });
    return data;
  },
  async getById(id: string): Promise<RentalContract> {
    const { data } = await api.get<{ contract: RentalContract }>(`/contracts/${id}`);
    return data.contract;
  },
  async create(input: { sourceType: 'REQUEST' | 'RESERVATION'; sourceId: string; startDate: string; endDate: string; monthlyRent?: number; depositAmount?: number; paymentDay?: number; notes?: string | null }): Promise<RentalContract> {
    const { data } = await api.post<{ contract: RentalContract }>('/contracts', input);
    return data.contract;
  },
  async activate(id: string): Promise<RentalContract> {
    const { data } = await api.patch<{ contract: RentalContract }>(`/contracts/${id}/activate`);
    return data.contract;
  },
  async terminate(id: string, notes?: string | null): Promise<RentalContract> {
    const { data } = await api.patch<{ contract: RentalContract }>(`/contracts/${id}/terminate`, { notes });
    return data.contract;
  },
  async renew(id: string, newEndDate: string): Promise<RentalContract> {
    const { data } = await api.patch<{ contract: RentalContract }>(`/contracts/${id}/renew`, { newEndDate });
    return data.contract;
  },
  async cancel(id: string): Promise<RentalContract> {
    const { data } = await api.patch<{ contract: RentalContract }>(`/contracts/${id}/cancel`);
    return data.contract;
  },
  async addInspection(contractId: string, input: { type: string; inspectionDate: string; generalObservations?: string | null; condition?: string | null; inspectorId?: string | null }): Promise<PropertyInspection> {
    const { data } = await api.post<{ inspection: PropertyInspection }>(`/contracts/${contractId}/inspections`, input);
    return data.inspection;
  },
  async addInspectionItem(inspectionId: string, observation: string, photo?: File): Promise<void> {
    const formData = new FormData();
    formData.append('observation', observation);
    if (photo) formData.append('photo', photo);
    await api.post(`/contracts/inspections/${inspectionId}/items`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  async deleteInspectionItem(itemId: string): Promise<void> {
    await api.delete(`/contracts/inspections/items/${itemId}`);
  },
};

// ─── Échéances de loyer ──────────────────────────────────────────────────────

export interface ListInvoicesParams {
  contractId?: string;
  ownerId?: string;
  tenantId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const invoicesApi = {
  async list(params: ListInvoicesParams): Promise<Paginated<RentInvoice>> {
    const { data } = await api.get<Paginated<RentInvoice>>('/contracts/invoices', { params });
    return data;
  },
  async getById(id: string): Promise<RentInvoice> {
    const { data } = await api.get<{ invoice: RentInvoice }>(`/contracts/invoices/${id}`);
    return data.invoice;
  },
  async pay(id: string, input: { amount: number; paymentMethod: string; paymentDate?: string; transactionReference?: string | null; notes?: string | null }): Promise<{ payment: Payment; invoice: RentInvoice }> {
    const { data } = await api.post(`/contracts/invoices/${id}/payments`, input);
    return data;
  },
  async createReceipt(id: string): Promise<Receipt> {
    const { data } = await api.post<{ receipt: Receipt }>(`/contracts/invoices/${id}/receipt`);
    return data.receipt;
  },
};

export const receiptsApi = {
  async list(params: { contractId?: string; page?: number; pageSize?: number }): Promise<Paginated<Receipt>> {
    const { data } = await api.get<Paginated<Receipt>>('/contracts/receipts', { params });
    return data;
  },
  downloadUrl(id: string): string {
    return `/api/contracts/receipts/${id}/download`;
  },
};

// ─── Paiements ───────────────────────────────────────────────────────────────

export interface ListPaymentsParams {
  clientId?: string;
  paymentType?: string;
  paymentMethod?: string;
  status?: string;
  saleId?: string;
  contractId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const paymentsApi = {
  async list(params: ListPaymentsParams): Promise<Paginated<Payment>> {
    const { data } = await api.get<Paginated<Payment>>('/payments', { params });
    return data;
  },
  async getById(id: string): Promise<Payment> {
    const { data } = await api.get<{ payment: Payment }>(`/payments/${id}`);
    return data.payment;
  },
  async createManual(input: { clientId: string; amount: number; paymentType: 'DEPOSIT' | 'OTHER'; paymentMethod: string; paymentDate: string; transactionReference?: string | null; notes?: string | null }): Promise<Payment> {
    const { data } = await api.post<{ payment: Payment }>('/payments', input);
    return data.payment;
  },
  async cancel(id: string, reason?: string | null): Promise<Payment> {
    const { data } = await api.patch<{ payment: Payment }>(`/payments/${id}/cancel`, { reason });
    return data.payment;
  },
};

// ─── Audit ───────────────────────────────────────────────────────────────────

export const auditApi = {
  async list(params: { entityType?: string; entityId?: string }): Promise<AuditLogEntry[]> {
    const { data } = await api.get<{ data: AuditLogEntry[] }>('/audit', { params });
    return data.data;
  },
};
