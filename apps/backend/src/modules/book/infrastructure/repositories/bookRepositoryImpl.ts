import { and, count, countDistinct, desc, eq } from 'drizzle-orm';

import { IdService } from '../../../../common/id/idService.ts';
import type { BookLanguage } from '../../../../common/types/language.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { books, captures, wordOccurrences } from '../../../../infrastructure/database/schema.ts';
import type { BookRepository, CreateBookData, UpdateBookData } from '../../domain/repositories/bookRepository.ts';
import type { Book, BookWithWordCount } from '../../domain/types/book.ts';

export class BookRepositoryImpl implements BookRepository {
  private readonly databaseClient: DatabaseClient;

  public constructor(databaseClient: DatabaseClient) {
    this.databaseClient = databaseClient;
  }

  public async create(data: CreateBookData): Promise<Book> {
    const [book] = await this.databaseClient.db
      .insert(books)
      .values({ id: IdService.generateUuid(), ...data })
      .returning();

    if (!book) {
      throw new Error('Failed to create book');
    }

    return this.mapToBook(book);
  }

  public async update(id: string, data: UpdateBookData): Promise<Book> {
    const [book] = await this.databaseClient.db.update(books).set(data).where(eq(books.id, id)).returning();

    if (!book) {
      throw new Error('Failed to update book');
    }

    return this.mapToBook(book);
  }

  public async findById(id: string, userId: string): Promise<Book | null> {
    const [book] = await this.databaseClient.db
      .select()
      .from(books)
      .where(and(eq(books.id, id), eq(books.userId, userId)))
      .limit(1);

    return book ? this.mapToBook(book) : null;
  }

  public async findByUserId(userId: string): Promise<BookWithWordCount[]> {
    const rows = await this.databaseClient.db
      .select({ book: books, wordCount: countDistinct(wordOccurrences.wordId) })
      .from(books)
      .leftJoin(wordOccurrences, eq(wordOccurrences.bookId, books.id))
      .where(eq(books.userId, userId))
      .groupBy(books.id)
      .orderBy(desc(books.createdAt));

    return rows.map((row) => ({ ...this.mapToBook(row.book), wordCount: row.wordCount }));
  }

  public async hasWordOccurrences(id: string): Promise<boolean> {
    const [result] = await this.databaseClient.db
      .select({ count: count() })
      .from(wordOccurrences)
      .where(eq(wordOccurrences.bookId, id));

    return (result?.count ?? 0) > 0;
  }

  public async delete(id: string): Promise<string[]> {
    return this.databaseClient.transaction(async (tx) => {
      const imageRows = await tx.select({ imageKey: captures.imageKey }).from(captures).where(eq(captures.bookId, id));

      await tx.delete(books).where(eq(books.id, id));

      return imageRows.map((row) => row.imageKey);
    });
  }

  private mapToBook(dbBook: typeof books.$inferSelect): Book {
    return {
      id: dbBook.id,
      userId: dbBook.userId,
      title: dbBook.title,
      author: dbBook.author,
      language: dbBook.language as BookLanguage,
      createdAt: dbBook.createdAt,
    };
  }
}
