import { apiRequest } from '../apiRequest';

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const changePassword = async (input: ChangePasswordRequest): Promise<void> => {
  return apiRequest('/users/me/change-password', {
    method: 'POST',
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    },
  });
};
