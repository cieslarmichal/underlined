import { apiRequest } from '../apiRequest';

export type ValidateOneTimeTokenRequest = {
  token: string;
  purpose: 'reset-password' | 'email-verification';
};

export type ValidateOneTimeTokenResponse = {
  valid: boolean;
};

export const validateOneTimeToken = async (
  input: ValidateOneTimeTokenRequest,
): Promise<ValidateOneTimeTokenResponse> => {
  return apiRequest<ValidateOneTimeTokenResponse>('/users/validate-one-time-token', {
    method: 'POST',
    body: { token: input.token, purpose: input.purpose },
  });
};
