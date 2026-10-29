import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExternalServiceError } from '../errors/externalServiceError.ts';
import { InputNotValidError } from '../errors/inputNotValidError.ts';
import { LoggerServiceFactory } from '../logger/loggerServiceFactory.ts';

import { OpenRouterService, type OpenRouterConfig } from './openRouterService.ts';
import type { ResponseFormat } from './types.ts';

const config: OpenRouterConfig = {
  apiKey: 'key',
  baseUrl: 'https://openrouter.test/api/v1',
  model: 'anthropic/claude-sonnet-5.5',
  temperature: 0,
  maxTokens: 1000,
  maxMessageLength: 1000,
  maxRetries: 3,
  retryDelayMs: 100,
  requestTimeoutMs: 50,
  maxRetryDelayMs: 100,
};

const responseFormat: ResponseFormat = {
  type: 'json_schema',
  json_schema: { name: 'test', strict: true, schema: { type: 'object' } },
};

const okBody = (content: string | null): Record<string, unknown> => ({
  id: 'gen-1',
  choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0.001 },
});

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

describe('OpenRouterService', () => {
  let openRouterService: OpenRouterService;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    openRouterService = new OpenRouterService(config, LoggerServiceFactory.create({ logLevel: 'silent' }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the request with the model, auth header and image parts and parses the structured answer', async () => {
    fetchMock.mockResolvedValueOnce(json(okBody('{"items":[]}')));

    const result = await openRouterService.sendRequest({
      systemMessage: 'system',
      userMessage: [
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } },
        { type: 'text', text: 'read it' },
      ],
      responseFormat,
    });

    expect(result).toEqual({
      data: { items: [] },
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.001 },
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://openrouter.test/api/v1/chat/completions');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer key');
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({ model: config.model, temperature: 0, response_format: responseFormat });
    expect((body['messages'] as { content: unknown }[])[1]?.content).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } },
      { type: 'text', text: 'read it' },
    ]);
  });

  it('retries on 429 and 5xx and then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ error: 'rate' }, 429))
      .mockResolvedValueOnce(json({ error: 'boom' }, 503))
      .mockResolvedValueOnce(json(okBody('{"ok":true}')));

    const result = await openRouterService.sendRequest({ systemMessage: 's', userMessage: 'u', responseFormat });

    expect(result.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry client errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'bad key' }, 401));

    await expect(
      openRouterService.sendRequest({ systemMessage: 's', userMessage: 'u', responseFormat }),
    ).rejects.toThrow(ExternalServiceError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after the maximum number of attempts', async () => {
    fetchMock.mockImplementation(async () => json({ error: 'down' }, 500));

    await expect(
      openRouterService.sendRequest({ systemMessage: 's', userMessage: 'u', responseFormat }),
    ).rejects.toThrow(ExternalServiceError);
    expect(fetchMock).toHaveBeenCalledTimes(config.maxRetries);
  });

  it('times out slow requests', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    );

    await expect(
      new OpenRouterService(
        { ...config, maxRetries: 1 },
        LoggerServiceFactory.create({ logLevel: 'silent' }),
      ).sendRequest({
        systemMessage: 's',
        userMessage: 'u',
        responseFormat,
      }),
    ).rejects.toMatchObject({ context: { isTimeout: true } });
  });

  it('throws ExternalServiceError when the answer is empty or not JSON', async () => {
    fetchMock.mockResolvedValueOnce(json(okBody(null)));
    await expect(
      openRouterService.sendRequest({ systemMessage: 's', userMessage: 'u', responseFormat }),
    ).rejects.toThrow(ExternalServiceError);

    fetchMock.mockResolvedValueOnce(json(okBody('not json')));
    await expect(
      openRouterService.sendRequest({ systemMessage: 's', userMessage: 'u', responseFormat }),
    ).rejects.toThrow(ExternalServiceError);
  });

  it('rejects empty and oversized text messages without calling the API', async () => {
    await expect(
      openRouterService.sendRequest({ systemMessage: '  ', userMessage: 'u', responseFormat }),
    ).rejects.toThrow(InputNotValidError);
    await expect(
      openRouterService.sendRequest({ systemMessage: 's', userMessage: 'x'.repeat(1001), responseFormat }),
    ).rejects.toThrow(InputNotValidError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
