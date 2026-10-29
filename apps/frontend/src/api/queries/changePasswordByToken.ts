import { apiRequest } from '../apiRequest';

type ChangePasswordByTokenRequest = {
  token: string;
  password: string;
};

export const changePasswordByToken = async (input: ChangePasswordByTokenRequest): Promise<void> => {
  await apiRequest<void>('/users/change-password-by-token', {
    method: 'POST',
    body: {
      token: input.token,
      newPassword: input.password,
    },
  });
};
