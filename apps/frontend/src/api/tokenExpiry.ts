// Reads the `exp` claim (in ms) from a JWT without verifying it - only used for scheduling refreshes.
export const getTokenExpiryMs = (token: string): number | null => {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const decoded: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

    if (typeof decoded === 'object' && decoded !== null && 'exp' in decoded && typeof decoded.exp === 'number') {
      return decoded.exp * 1000;
    }

    return null;
  } catch {
    return null;
  }
};
