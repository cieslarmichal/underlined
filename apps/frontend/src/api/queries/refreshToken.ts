import { config } from '../../config';

interface RefreshTokenResponse {
  accessToken: string;
}

export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  const response = await fetch(`${config.backendUrl}/users/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  return data as RefreshTokenResponse;
};
