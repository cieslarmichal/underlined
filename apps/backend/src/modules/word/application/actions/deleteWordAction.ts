import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { WordRepository } from '../../domain/repositories/wordRepository.ts';

export class DeleteWordAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  public async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.wordRepository.deleteWord(id, userId);

    if (!deleted) {
      throw new ResourceNotFoundError({ resource: 'Word', wordId: id });
    }
  }
}
