import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { WordRepository } from '../../domain/repositories/wordRepository.ts';

export class SetWordKnownAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  public async execute(wordId: string, userId: string, known: boolean): Promise<void> {
    const updated = await this.wordRepository.setKnown(wordId, userId, known);

    if (!updated) {
      throw new ResourceNotFoundError({ resource: 'Word', wordId });
    }
  }
}
