const key = 'underlined:last-book';

export function getLastBookId(): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLastBookId(id: string): void {
  try {
    localStorage.setItem(key, id);
  } catch {
    // Storage can be unavailable (private mode); the app still works without it.
  }
}

export function clearLastBookId(): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // See setLastBookId.
  }
}
