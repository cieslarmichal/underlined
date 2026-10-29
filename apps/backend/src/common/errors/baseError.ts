export interface BaseErrorContext {
  readonly originalError?: unknown;
  readonly [key: string]: unknown;
}

export abstract class BaseError<Context extends BaseErrorContext = BaseErrorContext> extends Error {
  public readonly context: Context;

  public constructor(name: string, message: string, context: Context) {
    super(message);

    this.name = name;
    this.context = context;
  }

  protected getExposableContextFields(): string[] {
    return [];
  }

  // Converts error to JSON for HTTP responses.
  public toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      name: this.name,
      message: this.message,
    };

    const exposableFields = this.getExposableContextFields();
    if (exposableFields.length > 0) {
      const safeContext: Record<string, unknown> = {};

      for (const field of exposableFields) {
        if (field in this.context && field !== 'originalError') {
          safeContext[field] = this.context[field];
        }
      }

      if (Object.keys(safeContext).length > 0) {
        json['context'] = safeContext;
      }
    }

    return json;
  }
}
