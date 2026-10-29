import { BaseError, type BaseErrorContext } from './baseError.ts';

interface Context extends BaseErrorContext {
  readonly resource: string;
}

export class ResourceNotFoundError extends BaseError<Context> {
  public constructor(context: Context) {
    super('ResourceNotFoundError', 'Resource not found.', context);
  }

  protected override getExposableContextFields(): string[] {
    return ['resource'];
  }
}
