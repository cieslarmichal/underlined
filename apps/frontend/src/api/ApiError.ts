export interface ApiErrorContext {
  [key: string]: unknown;
}

export class ApiError extends Error {
  public readonly name: string;
  public readonly status: number;
  public readonly context?: ApiErrorContext;

  constructor(name: string, message: string, status: number, context?: ApiErrorContext) {
    super(message);
    this.name = name;
    this.status = status;
    this.context = context;

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public isErrorType(errorName: string): boolean {
    return this.name === errorName;
  }

  public getContextValue<T = unknown>(key: string): T | undefined {
    return this.context?.[key] as T | undefined;
  }
}
