import { apiRequest } from '../apiRequest';

type VerifyEmailRequest = {
  token: string;
};

export const verifyEmail = async (input: VerifyEmailRequest): Promise<void> => {
  await apiRequest<void>('/users/verify-email', {
    method: 'POST',
    body: {
      token: input.token,
    },
  });
};
