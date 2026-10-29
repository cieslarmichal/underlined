import { describe, expect, it } from 'vitest';

import { candidateWeight, pickCandidate } from './rememberPicker.ts';
import type { RememberCandidate } from './types/word.ts';

const now = new Date('2026-03-10T12:00:00Z');
const daysAgo = (days: number): Date => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const candidate = (overrides: Partial<RememberCandidate> = {}): RememberCandidate => ({
  id: 'w',
  lemma: 'flee',
  encounters: 1,
  lastShownAt: null,
  lastOutcome: null,
  ...overrides,
});

describe('candidateWeight', () => {
  it('prefers words that were never shown over words shown just now', () => {
    expect(candidateWeight(candidate(), now)).toBeGreaterThan(
      candidateWeight(candidate({ lastShownAt: daysAgo(0) }), now),
    );
  });

  it('prefers words you keep meeting', () => {
    const rare = candidateWeight(candidate({ encounters: 1, lastShownAt: daysAgo(5) }), now);
    const frequent = candidateWeight(candidate({ encounters: 6, lastShownAt: daysAgo(5) }), now);

    expect(frequent).toBeGreaterThan(rare);
  });

  it('makes a word more likely the longer it was not shown, up to a cap', () => {
    const w = (days: number): number => candidateWeight(candidate({ lastShownAt: daysAgo(days) }), now);

    expect(w(1)).toBeLessThan(w(3));
    expect(w(3)).toBeLessThan(w(9));
    expect(w(30)).toBe(w(9));
  });

  it('shows a word less often after it was recalled than after "not yet"', () => {
    const recalled = candidateWeight(candidate({ lastShownAt: daysAgo(6), lastOutcome: 'recalled' }), now);
    const notYet = candidateWeight(candidate({ lastShownAt: daysAgo(6), lastOutcome: 'not_yet' }), now);

    expect(recalled).toBeLessThan(notYet);
  });

  it('never returns a zero weight', () => {
    expect(candidateWeight(candidate({ lastShownAt: now }), now)).toBeGreaterThan(0);
  });
});

describe('pickCandidate', () => {
  it('returns null when there is nothing to pick', () => {
    expect(pickCandidate([], now)).toBeNull();
  });

  it('picks proportionally to the weights using the given random source', () => {
    const light = candidate({ id: 'light', lastShownAt: daysAgo(0) });
    const heavy = candidate({ id: 'heavy', encounters: 5 });

    expect(pickCandidate([light, heavy], now, () => 0)?.id).toBe('light');
    expect(pickCandidate([light, heavy], now, () => 0.5)?.id).toBe('heavy');
    expect(pickCandidate([light, heavy], now, () => 0.999999)?.id).toBe('heavy');
  });

  it('picks the heavy word in most of the draws', () => {
    const light = candidate({ id: 'light', lastShownAt: daysAgo(0) });
    const heavy = candidate({ id: 'heavy' });
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const picks = Array.from({ length: 200 }, () => pickCandidate([light, heavy], now, random)?.id);

    expect(picks.filter((id) => id === 'heavy').length).toBeGreaterThan(150);
  });
});
