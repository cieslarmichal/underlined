import type { RememberCandidate } from './types/word.ts';

const dayMs = 24 * 60 * 60 * 1000;

// Words you keep meeting matter more, and words you have not seen for a while come back on their own.
// There is no schedule: recency only changes how likely a word is, so nothing is ever "overdue".
export function candidateWeight(candidate: RememberCandidate, now: Date): number {
  const frequency = 1 + Math.log(Math.max(1, candidate.encounters));

  if (!candidate.lastShownAt) {
    return frequency * 2;
  }

  const daysSinceShown = (now.getTime() - candidate.lastShownAt.getTime()) / dayMs;
  let recency = Math.min(3, Math.max(0.05, daysSinceShown / 3));

  if (candidate.lastOutcome === 'recalled') {
    recency *= 0.5;
  }

  return frequency * recency;
}

export function pickCandidate(
  candidates: RememberCandidate[],
  now: Date,
  random: () => number = Math.random,
): RememberCandidate | null {
  const weights = candidates.map((candidate) => candidateWeight(candidate, now));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (candidates.length === 0 || total <= 0) {
    return null;
  }

  let threshold = random() * total;

  for (const [index, candidate] of candidates.entries()) {
    threshold -= weights[index] ?? 0;

    if (threshold < 0) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1] ?? null;
}
