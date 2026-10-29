import { BaseError, type BaseErrorContext } from './baseError.ts';

interface Context extends BaseErrorContext {
  readonly resource: string;
  readonly reason: string;
}

export class ResourceConflictError extends BaseError<Context> {
  public constructor(context: Context) {
    super('ResourceConflictError', 'Resource is in conflict with its current state.', context);
  }

  protected override getExposableContextFields(): string[] {
    return ['resource', 'reason'];
  }
}
