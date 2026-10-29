import type { FindWordsParams, WordRepository } from '../../domain/repositories/wordRepository.ts';
import type { Word } from '../../domain/types/word.ts';

export class FindWordsAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  public async execute(params: FindWordsParams): Promise<Word[]> {
    return this.wordRepository.findMany(params);
  }
}
