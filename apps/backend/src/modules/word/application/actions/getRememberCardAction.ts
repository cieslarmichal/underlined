import { pickCandidate } from '../../domain/rememberPicker.ts';
import type { WordRepository } from '../../domain/repositories/wordRepository.ts';
import type { RememberCard } from '../../domain/types/word.ts';

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
    const occurrence = occurrences[Math.floor(random() * occurrences.length)];

    if (!occurrence) {
      return null;
    }

    return {
      wordId: candidate.id,
      lemma: candidate.lemma,
      encounters: candidate.encounters,
      sentence: occurrence.sentence,
      surfaceForm: occurrence.surfaceForm,
      translation: occurrence.translation,
      bookTitle: occurrence.bookTitle,
    };
  }
}
