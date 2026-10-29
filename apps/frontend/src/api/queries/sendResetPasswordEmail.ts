import { apiRequest } from '../apiRequest';

type SendResetPasswordEmailRequest = {
  email: string;
};

export const sendResetPasswordEmail = async (input: SendResetPasswordEmailRequest): Promise<void> => {
  await apiRequest<void>('/users/send-reset-password-email', {
    method: 'POST',
    body: {
      email: input.email,
    },
  });
};
