import { api } from './client.js';
import type { User } from '../types/index.js';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  },

  async updateProfile(input: { firstName: string; lastName: string; phone: string | null }): Promise<User> {
    const { data } = await api.put<{ user: User }>('/auth/profile', input);
    return data.user;
  },

  async changePassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<void> {
    await api.put('/auth/password', input);
  },
};
