import { apiRequest } from '../apiRequest';

type ResendVerificationRequest = {
  email: string;
};

export const resendVerification = async (input: ResendVerificationRequest): Promise<void> => {
  await apiRequest<void>('/users/resend-verification', {
    method: 'POST',
    body: {
      email: input.email,
    },
  });
};
