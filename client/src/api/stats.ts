import { api } from './client.js';
import type { DashboardStats } from '../types/index.js';

export const statsApi = {
  async dashboard(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/stats/dashboard');
    return data;
  },
};
