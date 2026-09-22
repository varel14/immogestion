import { api } from './client.js';
import type { ClientInput, OwnerInput, PropertyInput } from './types.js';
import type { Client, Paginated, Owner, Property } from '../types/index.js';

export interface ListOwnersParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export const ownersApi = {
  async list(params: ListOwnersParams): Promise<Paginated<Owner>> {
    const { data } = await api.get<Paginated<Owner>>('/owners', { params });
    return data;
  },

  async getById(id: string): Promise<Owner> {
    const { data } = await api.get<{ owner: Owner }>(`/owners/${id}`);
    return data.owner;
  },

  async getProperties(id: string): Promise<Property[]> {
    const { data } = await api.get<{ data: Property[] }>(`/owners/${id}/properties`);
    return data.data;
  },

  async create(input: OwnerInput): Promise<Owner> {
    const { data } = await api.post<{ owner: Owner }>('/owners', input);
    return data.owner;
  },

  async update(id: string, input: OwnerInput): Promise<Owner> {
    const { data } = await api.put<{ owner: Owner }>(`/owners/${id}`, input);
    return data.owner;
  },
};
