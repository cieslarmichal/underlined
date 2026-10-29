import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createActionTestContext, type ActionTestContext } from '../../../../../tests/helpers/actionTestContext.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';

import { assertWithinDailyLimit, startOfUtcDay } from './checkCaptureLimit.ts';

describe('checkCaptureLimit', () => {
  let context: ActionTestContext;

  beforeEach(async () => {
    context = await createActionTestContext();
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('returns midnight UTC of the given day', () => {
    expect(startOfUtcDay(new Date('2026-03-05T23:59:59Z')).toISOString()).toBe('2026-03-05T00:00:00.000Z');
  });

  it('allows photos below the limit and counts rejected ones but not failed ones', async () => {
    const user = await context.createUser();
    const limited = await context.userRepository.findById(user.id);
    if (!limited) throw new Error('user missing');
    const book = await context.createBook(user.id);
    const smallLimit = { ...limited, dailyCaptureLimit: 2 };

    await context.createCapture(user.id, book.id, [], 'failed');
    await context.createCapture(user.id, book.id, [], 'rejected');
    await expect(assertWithinDailyLimit(context.captureRepository, smallLimit)).resolves.toBeUndefined();

    await context.createCapture(user.id, book.id, [], 'accepted');
    await expect(assertWithinDailyLimit(context.captureRepository, smallLimit)).rejects.toThrow(OperationNotValidError);
  });
});
