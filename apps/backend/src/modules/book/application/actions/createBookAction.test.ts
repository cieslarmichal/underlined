import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { createActionTestContext, type ActionTestContext } from '../../../../../tests/helpers/actionTestContext.ts';
import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { CreateBookAction } from './createBookAction.ts';

describe('CreateBookAction', () => {
  let context: ActionTestContext;
  let createBookAction: CreateBookAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    createBookAction = new CreateBookAction(context.bookRepository, context.userRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('creates a book with a trimmed title and no author', async () => {
    const user = await context.createUser();

    const book = await createBookAction.execute({ userId: user.id, title: '  Dune ', author: '  ', language: 'en' });

    expect(book).toMatchObject({ userId: user.id, title: 'Dune', author: null, language: 'en' });
  });

  it('throws InputNotValidError when the book language equals the native language', async () => {
    const user = await context.createUser('en');

    await expect(createBookAction.execute({ userId: user.id, title: 'Dune', language: 'en' })).rejects.toThrow(
      InputNotValidError,
    );
  });

  it('throws ResourceNotFoundError when the user does not exist', async () => {
    await expect(createBookAction.execute({ userId: Generator.uuid(), title: 'Dune', language: 'en' })).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
