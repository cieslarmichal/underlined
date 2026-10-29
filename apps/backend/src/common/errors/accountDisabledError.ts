import { BaseError, type BaseErrorContext } from './baseError.ts';

interface Context extends BaseErrorContext {
  readonly reason: string;
  readonly userId?: string;
}

export class AccountDisabledError extends BaseError<Context> {
  public constructor(context: Context) {
    super('AccountDisabledError', 'Account is disabled', context);
  }
}
