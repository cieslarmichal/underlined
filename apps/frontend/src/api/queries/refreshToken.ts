import { config } from '../../config';
import { ApiError } from '../ApiError';

interface RefreshTokenResponse {
  accessToken: string;
}

export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  const response = await fetch(`${config.backendUrl}/users/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError('RefreshTokenError', 'Failed to refresh token', response.status);
  }

  const data = await response.json();
  return data as RefreshTokenResponse;
};
