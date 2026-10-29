import { apiRequest } from '../apiRequest';

export const logoutUser = async (): Promise<void> => {
  try {
    await apiRequest<void>('/users/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.warn('Logout request failed, but continuing with local cleanup:', error);
  }
};
