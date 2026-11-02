import type { FindWordsParams, WordRepository } from '../../domain/repositories/wordRepository.ts';
import { buildAnki, buildCsv, type ExportFormat } from '../../domain/wordsExport.ts';

export interface ExportWordsPayload {
  readonly userId: string;
  readonly format: ExportFormat;
  readonly bookId?: string | undefined;
  readonly status?: FindWordsParams['status'];
  readonly now?: Date;
}

export interface WordsExport {
  readonly filename: string;
  readonly contentType: string;
  readonly body: string;
}

export class ExportWordsAction {
  private readonly wordRepository: WordRepository;

  public constructor(wordRepository: WordRepository) {
    this.wordRepository = wordRepository;
  }

  public async execute(payload: ExportWordsPayload): Promise<WordsExport> {
    const words = await this.wordRepository.findMany({
      userId: payload.userId,
      bookId: payload.bookId,
      sort: 'newest',
      status: payload.status ?? 'all',
    });

    const date = (payload.now ?? new Date()).toISOString().slice(0, 10);

    if (payload.format === 'anki') {
      return {
        filename: `underlined-anki-${date}.txt`,
        contentType: 'text/plain; charset=utf-8',
        body: buildAnki(words),
      };
    }

    return {
      filename: `underlined-words-${date}.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: buildCsv(words),
    };
  }
}
