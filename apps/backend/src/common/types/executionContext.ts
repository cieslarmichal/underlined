export interface ExecutionContext {
  readonly requestId: string;
  readonly userId?: string; // Optional - only for authenticated requests
}
