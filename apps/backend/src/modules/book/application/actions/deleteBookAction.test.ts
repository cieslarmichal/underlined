import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceConflictError } from '../../../../common/errors/resourceConflictError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { S3Service } from '../../../../common/s3/s3Service.ts';

import { DeleteBookAction } from './deleteBookAction.ts';
import { FindBookAction } from './findBookAction.ts';

describe('DeleteBookAction', () => {
  let context: ActionTestContext;
  let deleteBookAction: DeleteBookAction;
  let deletedKeys: string[];
  let s3Fails: boolean;

  beforeEach(async () => {
    context = await createActionTestContext();
    deletedKeys = [];
    s3Fails = false;

    const s3Service = {
      deleteBlobs: async (_bucket: string, keys: string[]): Promise<void> => {
        if (s3Fails) throw new Error('s3 down');
        deletedKeys.push(...keys);
      },
    } as unknown as S3Service;

    deleteBookAction = new DeleteBookAction(
      context.bookRepository,
      new FindBookAction(context.bookRepository),
      s3Service,
      context.loggerService,
      context.config,
    );
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('deletes a book without words together with its captures and their images', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const capture = await context.createCapture(user.id, book.id, [], 'rejected');

    await deleteBookAction.execute(book.id, user.id, Generator.executionContext());

    expect(await context.bookRepository.findById(book.id, user.id)).toBeNull();
    expect(await context.captureRepository.findById(capture.id, user.id)).toBeNull();
    expect(deletedKeys).toEqual([capture.imageKey]);
  });

  it('throws ResourceConflictError when the book still has words', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);

    await expect(deleteBookAction.execute(book.id, user.id, Generator.executionContext())).rejects.toThrow(
      ResourceConflictError,
    );
    expect(await context.bookRepository.findById(book.id, user.id)).not.toBeNull();
  });

  it('still deletes the book when removing images from S3 fails', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.createCapture(user.id, book.id, [], 'rejected');
    s3Fails = true;

    await deleteBookAction.execute(book.id, user.id, Generator.executionContext());

    expect(await context.bookRepository.findById(book.id, user.id)).toBeNull();
  });

  it('throws ResourceNotFoundError for a book of another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);

    await expect(deleteBookAction.execute(book.id, other.id, Generator.executionContext())).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
