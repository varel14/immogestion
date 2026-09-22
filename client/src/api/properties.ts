import { api } from './client.js';
import type { PropertyInput } from './types.js';
import type { Paginated, Property } from '../types/index.js';

export interface ListPropertiesParams {
  search?: string;
  propertyType?: string;
  transactionType?: string;
  status?: string;
  city?: string;
  ownerId?: string;
  minPrice?: number;
  maxPrice?: number;
  isArchived?: 'true' | 'false';
  page?: number;
  pageSize?: number;
}

export const propertiesApi = {
  async list(params: ListPropertiesParams): Promise<Paginated<Property>> {
    const { data } = await api.get<Paginated<Property>>('/properties', { params });
    return data;
  },

  async getById(id: string): Promise<Property> {
    const { data } = await api.get<{ property: Property }>(`/properties/${id}`);
    return data.property;
  },

  async create(input: PropertyInput): Promise<Property> {
    const { data } = await api.post<{ property: Property }>('/properties', input);
    return data.property;
  },

  async update(id: string, input: PropertyInput): Promise<Property> {
    const { data } = await api.put<{ property: Property }>(`/properties/${id}`, input);
    return data.property;
  },

  async setArchived(id: string, isArchived: boolean): Promise<void> {
    await api.patch(`/properties/${id}/archive`, { isArchived });
  },

  async uploadPhotos(id: string, files: File[]): Promise<void> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    await api.post(`/properties/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async uploadDocuments(id: string, files: File[]): Promise<void> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    await api.post(`/properties/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async setPrimaryPhoto(mediaId: string): Promise<void> {
    await api.patch(`/media/${mediaId}/primary`);
  },

  async deleteMedia(mediaId: string): Promise<void> {
    await api.delete(`/media/${mediaId}`);
  },
};
