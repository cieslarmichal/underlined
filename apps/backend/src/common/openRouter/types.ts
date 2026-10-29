export interface ResponseFormat {
  readonly type: 'json_schema';
  readonly json_schema: {
    readonly name: string;
    readonly strict: boolean;
    readonly schema: Record<string, unknown>;
  };
}

export type ContentPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image_url'; readonly image_url: { readonly url: string } };

export interface Message {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string | ContentPart[];
}

export interface OpenRouterRequest {
  readonly model: string;
  readonly messages: Message[];
  readonly temperature: number;
  readonly max_tokens: number;
  readonly response_format: ResponseFormat;
  // Makes OpenRouter report the cost of the request in the response.
  readonly usage: { readonly include: boolean };
}

export interface OpenRouterResponse {
  readonly id: string;
  readonly choices: {
    readonly message: {
      readonly role: string;
      readonly content: string | null;
    };
    readonly finish_reason: string;
  }[];
  readonly usage: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_tokens: number;
    readonly cost?: number;
  };
}

export interface StructuredResponse<T = Record<string, unknown>> {
  readonly data: T;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
    readonly cost: number | undefined;
  };
}
