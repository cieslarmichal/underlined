import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createActionTestContext, type ActionTestContext } from '../../../../../tests/helpers/actionTestContext.ts';

import { UpdateNativeLanguageAction } from './updateNativeLanguageAction.ts';

describe('UpdateNativeLanguageAction', () => {
  let context: ActionTestContext;
  let updateNativeLanguageAction: UpdateNativeLanguageAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    updateNativeLanguageAction = new UpdateNativeLanguageAction(context.userRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('changes the native language', async () => {
    const user = await context.createUser('pl');

    const result = await updateNativeLanguageAction.execute(user.id, 'en');

    expect(result.nativeLanguage).toBe('en');
    expect((await context.userRepository.findById(user.id))?.nativeLanguage).toBe('en');
  });
});
