import { apiRequest } from '../apiRequest';

export const deleteUser = async (): Promise<void> => {
  return apiRequest('/users/me', {
    method: 'DELETE',
  });
};
