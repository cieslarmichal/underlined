const rememberCardKey = 'underlined:remember-card';

// Per-device preference: whether the Reading screen may suggest a word to remember. On by default.
export function isRememberCardEnabled(): boolean {
  try {
    return localStorage.getItem(rememberCardKey) !== 'off';
  } catch {
    return true;
  }
}

export function setRememberCardEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(rememberCardKey, enabled ? 'on' : 'off');
  } catch {
    // Storage can be unavailable (private mode); the preference then only lasts until reload.
  }
}
