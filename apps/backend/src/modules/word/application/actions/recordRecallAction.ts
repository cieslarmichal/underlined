import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { WordRepository } from '../../domain/repositories/wordRepository.ts';
import type { RememberOutcome } from '../../domain/types/word.ts';

export class RecordRecallAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  public async execute(wordId: string, userId: string, outcome: RememberOutcome, now = new Date()): Promise<void> {
    const recorded = await this.wordRepository.recordShown(wordId, userId, outcome, now);

    if (!recorded) {
      throw new ResourceNotFoundError({ resource: 'Word', wordId });
    }
  }
}
