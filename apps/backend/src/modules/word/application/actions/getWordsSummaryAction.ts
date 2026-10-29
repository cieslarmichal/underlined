import type { WordRepository } from '../../domain/repositories/wordRepository.ts';
import type { WordsSummary } from '../../domain/types/word.ts';

const weekMs = 7 * 24 * 60 * 60 * 1000;

export class GetWordsSummaryAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  // A quiet look at the last seven days: nothing to reach, just what happened.
  public async execute(userId: string, now = new Date()): Promise<WordsSummary> {
    return this.wordRepository.getSummary(userId, new Date(now.getTime() - weekMs));
  }
}
