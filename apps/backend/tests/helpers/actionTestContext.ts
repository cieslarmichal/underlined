import type { UnderlinedWord } from '../../src/common/ai/pageAnalysisService.ts';
import type { LoggerService } from '../../src/common/logger/loggerService.ts';
import { LoggerServiceFactory } from '../../src/common/logger/loggerServiceFactory.ts';
import type { BookLanguage, NativeLanguage } from '../../src/common/types/language.ts';
import { createConfig, type Config } from '../../src/core/config.ts';
import { DatabaseClient } from '../../src/infrastructure/database/databaseClient.ts';
import type { Book } from '../../src/modules/book/domain/types/book.ts';
import { BookRepositoryImpl } from '../../src/modules/book/infrastructure/repositories/bookRepositoryImpl.ts';
import type { Capture } from '../../src/modules/capture/domain/types/capture.ts';
import { CaptureRepositoryImpl } from '../../src/modules/capture/infrastructure/repositories/captureRepositoryImpl.ts';
import type { User } from '../../src/modules/user/domain/types/user.ts';
import { UserRepositoryImpl } from '../../src/modules/user/infrastructure/repositories/userRepositoryImpl.ts';
import { WordRepositoryImpl } from '../../src/modules/word/infrastructure/repositories/wordRepositoryImpl.ts';
import { Generator } from '../generator.ts';
import { truncateTables } from './dbCleanup.ts';

export interface ActionTestContext {
  readonly config: Config;
  readonly loggerService: LoggerService;
  readonly databaseClient: DatabaseClient;
  readonly userRepository: UserRepositoryImpl;
  readonly bookRepository: BookRepositoryImpl;
  readonly captureRepository: CaptureRepositoryImpl;
  readonly wordRepository: WordRepositoryImpl;
  createUser(nativeLanguage?: NativeLanguage): Promise<User>;
  createBook(userId: string, language?: BookLanguage): Promise<Book>;
  createCapture(userId: string, bookId: string, items?: UnderlinedWord[], status?: Capture['status']): Promise<Capture>;
  saveWord(book: Book, userId: string, item: UnderlinedWord): Promise<void>;
  cleanup(): Promise<void>;
}

export const fled: UnderlinedWord = {
  surfaceForm: 'fled',
  lemma: 'flee',
  sentence: 'Harry fled the room before anyone could stop him.',
  translation: 'uciekać',
};

export async function createActionTestContext(): Promise<ActionTestContext> {
  const config = createConfig();
  const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
  const databaseClient = new DatabaseClient(config.database, loggerService);
  const userRepository = new UserRepositoryImpl(databaseClient);
  const bookRepository = new BookRepositoryImpl(databaseClient);
  const captureRepository = new CaptureRepositoryImpl(databaseClient);
  const wordRepository = new WordRepositoryImpl(databaseClient);

  await truncateTables(databaseClient);

  return {
    config,
    loggerService,
    databaseClient,
    userRepository,
    bookRepository,
    captureRepository,
    wordRepository,
    createUser: (nativeLanguage = 'pl') => userRepository.create({ ...Generator.userData(), nativeLanguage }),
    createBook: (userId, language = 'en') =>
      bookRepository.create({ userId, title: Generator.words(2), author: null, language }),
    createCapture: async (userId, bookId, items = [], status = 'pending_review'): Promise<Capture> => {
      const capture = await captureRepository.create({
        userId,
        bookId,
        imageKey: `captures/${userId}/${Generator.uuid()}.jpg`,
        targetLanguage: 'pl',
      });
      return captureRepository.update(capture.id, { status, items });
    },
    saveWord: async (book, userId, item): Promise<void> => {
      const capture = await captureRepository.create({
        userId,
        bookId: book.id,
        imageKey: Generator.uuid(),
        targetLanguage: 'pl',
      });
      await databaseClient.transaction(async (tx) => {
        await wordRepository.saveOccurrence(
          {
            userId,
            bookId: book.id,
            captureId: capture.id,
            sourceLanguage: book.language,
            targetLanguage: 'pl',
            ...item,
          },
          tx,
        );
      });
    },
    cleanup: async (): Promise<void> => {
      await truncateTables(databaseClient);
      await databaseClient.close();
    },
  };
}
