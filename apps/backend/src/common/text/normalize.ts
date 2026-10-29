export function normalizeLemma(lemma: string): string {
  return lemma.trim().toLowerCase();
}

// Lets the same sentence match even when the model rewrites quotes, dashes or spacing slightly.
export function normalizeSentence(sentence: string): string {
  return sentence
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
