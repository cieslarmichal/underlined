import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { WordRepository } from '../../domain/repositories/wordRepository.ts';

export class DeleteWordFromBookAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  public async execute(wordId: string, bookId: string, userId: string): Promise<void> {
    const deleted = await this.wordRepository.deleteWordFromBook(wordId, bookId, userId);

    if (!deleted) {
      throw new ResourceNotFoundError({ resource: 'Word', wordId, bookId });
    }
  }
}
