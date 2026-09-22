import { api } from './client.js';
import type { CreateUserData, UpdateUserData } from './types.js';
import type { Paginated, User } from '../types/index.js';

export interface ListUsersParams {
  search?: string;
  role?: string;
  isActive?: 'true' | 'false';
  page?: number;
  pageSize?: number;
}

export const usersApi = {
  async list(params: ListUsersParams): Promise<Paginated<User>> {
    const { data } = await api.get<Paginated<User>>('/users', { params });
    return data;
  },

  async getById(id: string): Promise<User> {
    const { data } = await api.get<{ user: User }>(`/users/${id}`);
    return data.user;
  },

  async create(input: CreateUserData): Promise<User> {
    const { data } = await api.post<{ user: User }>('/users', input);
    return data.user;
  },

  async update(id: string, input: UpdateUserData): Promise<User> {
    const { data } = await api.put<{ user: User }>(`/users/${id}`, input);
    return data.user;
  },

  async updateStatus(id: string, isActive: boolean): Promise<User> {
    const { data } = await api.patch<{ user: User }>(`/users/${id}/status`, { isActive });
    return data.user;
  },
};
