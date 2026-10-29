import { apiRequest } from '../apiRequest';
import type { Capture } from '../types/capture';

export const uploadCapture = (bookId: string, photo: Blob): Promise<Capture> => {
  const body = new FormData();
  body.append('file', photo, 'page.jpg');

  return apiRequest<Capture>(`/books/${bookId}/captures`, { method: 'POST', body });
};

export const getPendingCaptures = async (bookId: string): Promise<Capture[]> => {
  const response = await apiRequest<{ data: Capture[] }>(`/books/${bookId}/captures`, {
    method: 'GET',
    params: new URLSearchParams({ status: 'pending_review' }),
  });
  return response.data;
};

export const acceptCapture = (id: string): Promise<void> =>
  apiRequest<void>(`/captures/${id}/accept`, { method: 'POST' });

export const rejectCapture = (id: string): Promise<void> =>
  apiRequest<void>(`/captures/${id}/reject`, { method: 'POST' });

export const retryCapture = (id: string): Promise<Capture> =>
  apiRequest<Capture>(`/captures/${id}/retry`, { method: 'POST' });
