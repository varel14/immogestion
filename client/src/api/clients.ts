import { api } from './client.js';
import type { ClientInput } from './types.js';
import type { Client, Paginated } from '../types/index.js';

export interface ListClientsParams {
  search?: string;
  isActive?: 'true' | 'false';
  page?: number;
  pageSize?: number;
}

export const clientsApi = {
  async list(params: ListClientsParams): Promise<Paginated<Client>> {
    const { data } = await api.get<Paginated<Client>>('/clients', { params });
    return data;
  },

  async getById(id: string): Promise<Client> {
    const { data } = await api.get<{ client: Client }>(`/clients/${id}`);
    return data.client;
  },

  async create(input: ClientInput): Promise<Client> {
    const { data } = await api.post<{ client: Client }>('/clients', input);
    return data.client;
  },

  async update(id: string, input: ClientInput): Promise<Client> {
    const { data } = await api.put<{ client: Client }>(`/clients/${id}`, input);
    return data.client;
  },

  async updateStatus(id: string, isActive: boolean): Promise<Client> {
    const { data } = await api.patch<{ client: Client }>(`/clients/${id}/status`, { isActive });
    return data.client;
  },
};
