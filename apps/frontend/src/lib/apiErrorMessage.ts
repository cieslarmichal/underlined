import { ApiError } from '../api/ApiError';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const reason = error.getContextValue<string>('reason');

    return reason || (error.message && error.message !== 'Operation not valid.' ? error.message : fallback);
  }

  return fallback;
}
