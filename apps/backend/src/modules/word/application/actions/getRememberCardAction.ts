import { pickCandidate } from '../../domain/rememberPicker.ts';
import type { WordRepository } from '../../domain/repositories/wordRepository.ts';
import type { RememberCard } from '../../domain/types/word.ts';

const maxSentences = 2;

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }

  return copy;
}

export interface GetRememberCardOptions {
  readonly now?: Date;
  readonly random?: () => number;
}

export class GetRememberCardAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  // Returns null when there is nothing to show (no saved words, or all of them are known).
  public async execute(
    userId: string,
    bookId?: string,
    options: GetRememberCardOptions = {},
  ): Promise<RememberCard | null> {
    const { now = new Date(), random = Math.random } = options;

    const candidates = await this.wordRepository.findRememberCandidates(userId, bookId);
    const candidate = pickCandidate(candidates, now, random);

    if (!candidate) {
      return null;
    }

    const occurrences = await this.wordRepository.findOccurrences(candidate.id, bookId);
    const shown = shuffle(occurrences, random).slice(0, maxSentences);

    if (shown.length === 0) {
      return null;
    }

    return {
      wordId: candidate.id,
      lemma: candidate.lemma,
      sentences: shown.map(({ sentence, surfaceForm }) => ({ sentence, surfaceForm })),
      translations: [...new Set(shown.map((occurrence) => occurrence.translation))],
    };
  }
}
