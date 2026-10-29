import { apiRequest } from '../apiRequest';
import type { User } from '../types/user';

export interface AdminUsersParams {
  page?: number;
  pageSize?: number;
  email?: string;
}

export interface AdminUsersResponse {
  data: User[];
  metadata: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export const getAdminUsers = async (params: AdminUsersParams = {}): Promise<AdminUsersResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.pageSize !== undefined) searchParams.set('pageSize', String(params.pageSize));
  if (params.email) searchParams.set('email', params.email);

  return apiRequest<AdminUsersResponse>('/admin/users', {
    method: 'GET',
    params: searchParams,
  });
};
