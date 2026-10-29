import { type BaseErrorContext, BaseError } from './baseError.ts';

interface Context extends BaseErrorContext {
  readonly reason: string;
  readonly silent?: boolean; // If true, suppress warning logs (expected auth failures)
}

export class UnauthorizedAccessError extends BaseError<Context> {
  public constructor(context: Context) {
    super('UnauthorizedAccessError', 'Not authorized to perform this action.', context);
  }

  protected override getExposableContextFields(): string[] {
    return ['reason'];
  }

  public get isSilent(): boolean {
    return this.context.silent === true;
  }
}
