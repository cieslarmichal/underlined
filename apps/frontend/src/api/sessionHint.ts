// Non-sensitive marker that this browser has (probably) an active session.
// The refresh token itself lives in an HTTP-only cookie that JavaScript cannot see,
// so without this marker every anonymous visit would hit /users/refresh-token just to get a 401.
const SESSION_HINT_KEY = 'has-session';

export const hasSessionHint = (): boolean => {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    // Storage unavailable (e.g. blocked site data) - fall back to always trying the refresh.
    return true;
  }
};

export const setSessionHint = (): void => {
  try {
    localStorage.setItem(SESSION_HINT_KEY, '1');
  } catch {
    // Ignore - hasSessionHint falls back to true when storage is unavailable.
  }
};

export const clearSessionHint = (): void => {
  try {
    localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Ignore - hasSessionHint falls back to true when storage is unavailable.
  }
};
