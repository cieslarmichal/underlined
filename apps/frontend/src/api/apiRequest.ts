import { config } from '../config';
import { ApiError } from './ApiError.ts';
import { refreshToken } from './queries/refreshToken';

interface ErrorResponse {
  name?: string;
  message?: string;
  context?: Record<string, unknown>;
}

interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  params?: URLSearchParams;
}

// Store the current access token value directly
let currentAccessToken: string | null = null;
let onTokenRefresh: ((newToken: string) => void) | null = null;
// Global single-flight promise to serialize refresh calls across the app
let refreshPromise: Promise<{ accessToken: string }> | null = null;
// Track if we've attempted initial auth
let hasAttemptedInitialAuth = false;

export const setAccessToken = (token: string | null) => {
  currentAccessToken = token;
  hasAttemptedInitialAuth = true;
};

const getAccessToken = () => currentAccessToken;

export const setTokenRefreshCallback = (callback: (newToken: string) => void) => {
  onTokenRefresh = callback;
};

// Public helper to request an access token refresh in a single-flight manner
// Ensures concurrent callers share the same promise and only one network call is made
export const requestAccessTokenRefresh = async (): Promise<{ accessToken: string }> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const res = await refreshToken();
    // Update the module-level token immediately
    currentAccessToken = res.accessToken;
    // Also notify the callback for React state updates
    if (onTokenRefresh) {
      onTokenRefresh(res.accessToken);
    }
    return res;
  })();

  try {
    return await refreshPromise;
  } finally {
    // Delay clearing to allow any immediate follow-up requests to see the promise
    setTimeout(() => {
      refreshPromise = null;
    }, 100);
  }
};

export const apiRequest = async <T>(endpoint: string, options: ApiRequestConfig): Promise<T> => {
  const { method, body, params } = options;

  const url = params ? `${config.backendUrl}${endpoint}?${params}` : `${config.backendUrl}${endpoint}`;

  const makeRequest = async (token?: string): Promise<Response> => {
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const requestConfig: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (body) {
      if (body instanceof FormData) {
        requestConfig.body = body;
      } else {
        requestConfig.body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
      }
    }

    return fetch(url, requestConfig);
  };

  // If we haven't attempted initial auth yet and don't have a token, trigger refresh
  if (
    !hasAttemptedInitialAuth &&
    !currentAccessToken &&
    endpoint !== '/users/refresh-token' &&
    endpoint !== '/users/login'
  ) {
    try {
      await requestAccessTokenRefresh();
    } catch {
      // Continue anyway, request will likely get 401
    }
  }

  // If a refresh is already in progress, wait for it to complete before making the request
  if (refreshPromise && endpoint !== '/users/refresh-token' && endpoint !== '/users/login') {
    try {
      await refreshPromise;
    } catch {
      // If refresh fails, continue with the request (it will get a 401 and handle it)
    }
  }

  const accessToken = getAccessToken();
  let response = await makeRequest(accessToken || undefined);

  if (!response.ok && response.status === 401 && endpoint !== '/users/login') {
    try {
      const refreshResponse = await requestAccessTokenRefresh();
      response = await makeRequest(refreshResponse.accessToken);
    } catch (refreshError) {
      throw new Error(`Authentication failed: ${String(refreshError)}`, { cause: refreshError });
    }
  }

  if (!response.ok) {
    let errorResponse: ErrorResponse | null;

    try {
      errorResponse = await response.json();
    } catch {
      // If response is not JSON, fall back to generic error
      throw new ApiError('NetworkError', response.statusText || 'Request failed', response.status);
    }

    throw new ApiError(
      errorResponse?.name || 'UnknownError',
      errorResponse?.message || response.statusText || 'Request failed',
      response.status,
      errorResponse?.context,
    );
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  const responseData = await response.json();

  if (endpoint === '/users/login' && response.ok) {
    // Update the module-level token immediately
    currentAccessToken = responseData.accessToken;
    // Also notify the callback for React state updates
    if (onTokenRefresh) {
      onTokenRefresh(responseData.accessToken);
    }
  }

  return responseData;
};
