import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { normalizeLemma } from '../../../../common/text/normalize.ts';
import type { BookRepository } from '../../../book/domain/repositories/bookRepository.ts';
import type { WordRepository } from '../../../word/domain/repositories/wordRepository.ts';
import type { Capture, CaptureView } from '../../domain/types/capture.ts';

export class CaptureViewService {
  private readonly bookRepository: BookRepository;
  private readonly wordRepository: WordRepository;

  public constructor(bookRepository: BookRepository, wordRepository: WordRepository) {
    this.bookRepository = bookRepository;
    this.wordRepository = wordRepository;
  }

  // Adds "already have" counters, so the preview can mark words that are in the dictionary.
  public async toView(capture: Capture): Promise<CaptureView> {
    const book = await this.bookRepository.findById(capture.bookId, capture.userId);

    if (!book) {
      throw new ResourceNotFoundError({ resource: 'Book', bookId: capture.bookId });
    }

    const counts = await this.wordRepository.countOccurrencesByLemma(
      capture.userId,
      book.language,
      capture.targetLanguage,
      capture.items.map((item) => normalizeLemma(item.lemma)),
    );

    return {
      capture,
      items: capture.items.map((item) => ({ ...item, timesSeen: counts.get(normalizeLemma(item.lemma)) ?? 0 })),
    };
  }
}
