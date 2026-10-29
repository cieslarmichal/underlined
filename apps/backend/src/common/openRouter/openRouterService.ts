import { ExternalServiceError } from '../errors/externalServiceError.ts';
import { InputNotValidError } from '../errors/inputNotValidError.ts';
import type { LoggerService } from '../logger/loggerService.ts';

import type {
  ContentPart,
  Message,
  OpenRouterRequest,
  OpenRouterResponse,
  ResponseFormat,
  StructuredResponse,
} from './types.ts';

export interface OpenRouterConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly maxMessageLength: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly requestTimeoutMs: number;
  readonly maxRetryDelayMs: number;
}

export interface SendRequestParams {
  readonly systemMessage: string;
  // Plain text, or text with images (image URLs may be base64 data URLs).
  readonly userMessage: string | ContentPart[];
  readonly responseFormat: ResponseFormat;
}

export class OpenRouterService {
  private readonly config: OpenRouterConfig;
  private readonly logger: LoggerService;

  public constructor(config: OpenRouterConfig, logger: LoggerService) {
    this.config = config;
    this.logger = logger;
  }

  public async sendRequest<Response = Record<string, unknown>>(
    params: SendRequestParams,
  ): Promise<StructuredResponse<Response>> {
    const payload = this.preparePayload(params);

    this.logger.debug({
      message: 'Sending request to OpenRouter API',
      event: 'openRouter.request.start',
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    const startTime = Date.now();

    try {
      const response = await this.executeRequestWithRetry(payload);
      const duration = Date.now() - startTime;

      this.logger.info({
        message: 'OpenRouter API request successful',
        event: 'openRouter.request.success',
        duration,
        model: this.config.model,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        cost: response.usage.cost,
      });

      return this.formatResponse<Response>(response);
    } catch (error) {
      this.logger.error({
        message: 'OpenRouter API request failed',
        event: 'openRouter.request.error',
        duration: Date.now() - startTime,
        model: this.config.model,
        err: error,
      });

      throw error;
    }
  }

  private formatResponse<T>(rawResponse: OpenRouterResponse): StructuredResponse<T> {
    const content = rawResponse.choices[0]?.message.content;

    if (!content) {
      throw new ExternalServiceError({
        service: 'OpenRouter API',
        reason: 'No content in response message',
        responseBody: rawResponse,
      });
    }

    try {
      return {
        data: JSON.parse(content) as T,
        usage: {
          promptTokens: rawResponse.usage.prompt_tokens,
          completionTokens: rawResponse.usage.completion_tokens,
          totalTokens: rawResponse.usage.total_tokens,
          cost: rawResponse.usage.cost,
        },
      };
    } catch (error) {
      throw new ExternalServiceError({
        service: 'OpenRouter API',
        reason: 'Failed to parse response content as JSON',
        originalError: error,
        responseBody: content,
      });
    }
  }

  private preparePayload(params: SendRequestParams): OpenRouterRequest {
    const { systemMessage, userMessage, responseFormat } = params;

    this.validateText(systemMessage);

    if (typeof userMessage === 'string') {
      this.validateText(userMessage);
    }

    const messages: Message[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ];

    return {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      response_format: responseFormat,
      usage: { include: true },
    };
  }

  private async executeRequestWithRetry(payload: OpenRouterRequest): Promise<OpenRouterResponse> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.executeRequest(payload);
      } catch (error) {
        if (!this.isRetryableError(error) || attempt >= this.config.maxRetries) {
          throw error;
        }

        const delayMs = this.calculateRetryDelay(attempt);

        this.logger.warn({
          message: 'Retrying OpenRouter API request due to error',
          event: 'openRouter.request.retry',
          attempt,
          maxRetries: this.config.maxRetries,
          delayMs,
          err: error,
        });

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private async executeRequest(payload: OpenRouterRequest): Promise<OpenRouterResponse> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.config.requestTimeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new ExternalServiceError({
          service: 'OpenRouter API',
          reason: `OpenRouter API request failed with status ${response.status.toString()}`,
          responseBody: await response.text(),
          statusCode: response.status,
        });
      }

      return (await response.json()) as OpenRouterResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ExternalServiceError({
          service: 'OpenRouter API',
          reason: `Request timeout after ${this.config.requestTimeoutMs.toString()}ms`,
          timeoutMs: this.config.requestTimeoutMs,
          isTimeout: true,
        });
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private validateText(message: string): void {
    if (!message || message.trim().length === 0) {
      throw new InputNotValidError({ reason: 'Message cannot be empty' });
    }

    if (message.length > this.config.maxMessageLength) {
      throw new InputNotValidError({
        reason: `Message length exceeds maximum allowed (${this.config.maxMessageLength.toString()} characters)`,
      });
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof ExternalServiceError) {
      const statusCode = error.context['statusCode'];

      if (typeof statusCode === 'number') {
        return statusCode === 429 || statusCode >= 500;
      }

      return error.context['isTimeout'] === true;
    }

    if (error instanceof Error) {
      return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'fetch failed'].some((code) =>
        error.message.includes(code),
      );
    }

    return false;
  }

  private calculateRetryDelay(attempt: number): number {
    const cappedDelay = Math.min(this.config.retryDelayMs * Math.pow(2, attempt - 1), this.config.maxRetryDelayMs);
    // Jitter of ±20% prevents retries from many requests landing at the same moment.
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);

    return Math.max(0, Math.floor(cappedDelay + jitter));
  }
}
