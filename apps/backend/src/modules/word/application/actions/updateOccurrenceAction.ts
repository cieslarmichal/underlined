import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { WordRepository } from '../../domain/repositories/wordRepository.ts';

export class UpdateOccurrenceAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  public async execute(id: string, userId: string, translation: string): Promise<void> {
    const trimmed = translation.trim();

    if (!trimmed) {
      throw new InputNotValidError({ reason: 'Translation must not be empty' });
    }

    const updated = await this.wordRepository.updateOccurrenceTranslation(id, userId, trimmed);

    if (!updated) {
      throw new ResourceNotFoundError({ resource: 'WordOccurrence', occurrenceId: id });
    }
  }
}
