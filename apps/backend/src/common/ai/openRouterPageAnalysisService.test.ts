import { beforeEach, describe, expect, it } from 'vitest';

import { ExternalServiceError } from '../errors/externalServiceError.ts';
import type { OpenRouterService, SendRequestParams } from '../openRouter/openRouterService.ts';

import { OpenRouterPageAnalysisService } from './openRouterPageAnalysisService.ts';
import type { AnalyzePagePayload } from './pageAnalysisService.ts';

const payload: AnalyzePagePayload = {
  image: Buffer.from('page'),
  imageMimeType: 'image/jpeg',
  bookTitle: 'Harry Potter',
  bookAuthor: 'J. K. Rowling',
  bookLanguage: 'en',
  nativeLanguage: 'pl',
};

describe('OpenRouterPageAnalysisService', () => {
  let answer: unknown;
  let sent: SendRequestParams | undefined;
  let service: OpenRouterPageAnalysisService;

  beforeEach(() => {
    sent = undefined;
    answer = { items: [] };
    service = new OpenRouterPageAnalysisService({
      sendRequest: async (params: SendRequestParams) => {
        sent = params;
        return { data: answer, usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, cost: undefined } };
      },
    } as unknown as OpenRouterService);
  });

  it('sends the page as a base64 image together with book context in the prompt', async () => {
    await service.analyzePage(payload);

    expect(sent?.systemMessage).toContain('"Harry Potter" by J. K. Rowling');
    expect(sent?.systemMessage).toContain('English');
    expect(sent?.systemMessage).toContain('Polish');
    expect(sent?.userMessage).toContainEqual({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${Buffer.from('page').toString('base64')}` },
    });
    expect(sent?.responseFormat.json_schema.strict).toBe(true);
  });

  it('maps the items to camelCase and trims them', async () => {
    answer = {
      items: [{ surface_form: ' fled ', lemma: 'flee ', sentence: ' Harry fled. ', translation: ' uciekać ' }],
    };

    expect(await service.analyzePage(payload)).toEqual([
      { surfaceForm: 'fled', lemma: 'flee', sentence: 'Harry fled.', translation: 'uciekać' },
    ]);
  });

  it('drops malformed items and items without a lemma or translation', async () => {
    answer = {
      items: [
        { surface_form: 'a', lemma: '', sentence: 's', translation: 't' },
        { surface_form: 'b', lemma: 'b', sentence: 's', translation: ' ' },
        { surface_form: 'c', lemma: 'c', sentence: 5, translation: 't' },
        { surface_form: 'ok', lemma: 'ok', sentence: 's', translation: 't' },
      ],
    };

    const words = await service.analyzePage(payload);

    expect(words.map((word) => word.lemma)).toEqual(['ok']);
  });

  it('throws ExternalServiceError when the result has no items list', async () => {
    answer = { nope: true };

    await expect(service.analyzePage(payload)).rejects.toThrow(ExternalServiceError);
  });
});
