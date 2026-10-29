import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { normalizeLemma } from '../../../../common/text/normalize.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import type { BookRepository } from '../../../book/domain/repositories/bookRepository.ts';
import type { WordRepository } from '../../../word/domain/repositories/wordRepository.ts';
import type { CaptureRepository } from '../../domain/repositories/captureRepository.ts';

export class AcceptCaptureAction {
  private readonly captureRepository: CaptureRepository;
  private readonly bookRepository: BookRepository;
  private readonly wordRepository: WordRepository;
  private readonly databaseClient: DatabaseClient;

  public constructor(
    captureRepository: CaptureRepository,
    bookRepository: BookRepository,
    wordRepository: WordRepository,
    databaseClient: DatabaseClient,
  ) {
    this.captureRepository = captureRepository;
    this.bookRepository = bookRepository;
    this.wordRepository = wordRepository;
    this.databaseClient = databaseClient;
  }

  public async execute(id: string, userId: string): Promise<void> {
    const capture = await this.captureRepository.findById(id, userId);

    if (!capture) {
      throw new ResourceNotFoundError({ resource: 'Capture', captureId: id });
    }

    if (capture.status !== 'pending_review') {
      throw new OperationNotValidError({ reason: 'This photo is not waiting for review' });
    }

    const book = await this.bookRepository.findById(capture.bookId, userId);

    if (!book) {
      throw new ResourceNotFoundError({ resource: 'Book', bookId: capture.bookId });
    }

    // One word from one photo gives one occurrence.
    const uniqueItems = new Map<string, (typeof capture.items)[number]>();

    for (const item of capture.items) {
      const key = normalizeLemma(item.lemma);

      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    }

    await this.databaseClient.transaction(async (tx) => {
      for (const item of uniqueItems.values()) {
        await this.wordRepository.saveOccurrence(
          {
            userId,
            bookId: book.id,
            captureId: capture.id,
            sourceLanguage: book.language,
            targetLanguage: capture.targetLanguage,
            lemma: item.lemma,
            surfaceForm: item.surfaceForm,
            sentence: item.sentence,
            translation: item.translation,
          },
          tx,
        );
      }

      await this.captureRepository.update(capture.id, { status: 'accepted' }, tx);
    });
  }
}
