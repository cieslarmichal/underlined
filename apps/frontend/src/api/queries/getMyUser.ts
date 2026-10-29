import { apiRequest } from '../apiRequest';
import { User } from '../types/user';

export const getMyUser = async (): Promise<User> => {
  return apiRequest<User>('/users/me', {
    method: 'GET',
  });
};
