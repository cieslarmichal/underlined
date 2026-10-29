import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExternalServiceError } from '../errors/externalServiceError.ts';

import { OpenLibraryService, type OpenLibraryConfig } from './openLibraryService.ts';

const config: OpenLibraryConfig = {
  baseUrl: 'https://openlibrary.test',
  timeoutMs: 50,
  userAgent: 'Underlined/test',
  maxSuggestions: 3,
  cacheTtlMs: 1000,
  cacheMaxEntries: 2,
};

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

describe('OpenLibraryService', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let service: OpenLibraryService;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    service = new OpenLibraryService(config);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('asks Open Library with the language code and a User-Agent and maps the results', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        docs: [{ title: 'Cien años de soledad', author_name: ['Gabriel García Márquez'], first_publish_year: 1967 }],
      }),
    );

    const result = await service.search('cien años', 'es');

    expect(result).toEqual([{ title: 'Cien años de soledad', author: 'Gabriel García Márquez', year: 1967 }]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe('https://openlibrary.test/search.json');
    expect(parsed.searchParams.get('q')).toBe('cien años');
    expect(parsed.searchParams.get('language')).toBe('spa');
    expect((init?.headers as Record<string, string>)['User-Agent']).toBe('Underlined/test');
  });

  it('drops series, box sets and duplicates and caps the number of suggestions', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        docs: [
          { title: 'Harry Potter (series) 1-7', author_name: ['J. K. Rowling'] },
          { title: 'Harry Potter Box Set', author_name: ['J. K. Rowling'] },
          {
            title: 'Harry Potter and the Chamber of Secrets',
            author_name: ['J. K. Rowling'],
            first_publish_year: 1998,
          },
          { title: 'Harry Potter and the chamber of secrets!', author_name: ['J. K. Rowling'] },
          { title: 'Harry Potter and the Philosopher’s Stone', author_name: ['J. K. Rowling'] },
          { title: 'Harry Potter and the Goblet of Fire' },
          { title: 'Harry Potter and the Order of the Phoenix', author_name: ['J. K. Rowling'] },
          { title: '   ' },
          { nope: true },
        ],
      }),
    );

    const result = await service.search('harry potter');

    expect(result.map((suggestion) => suggestion.title)).toEqual([
      'Harry Potter and the Chamber of Secrets',
      'Harry Potter and the Philosopher’s Stone',
      'Harry Potter and the Goblet of Fire',
    ]);
    expect(result[2]).toMatchObject({ author: null, year: null });
  });

  it('serves repeated searches from the cache and evicts the oldest entry', async () => {
    fetchMock.mockImplementation(async () => json({ docs: [{ title: 'Dune', author_name: ['Frank Herbert'] }] }));

    await service.search('dune');
    await service.search('DUNE');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await service.search('emma');
    await service.search('ulysses');
    await service.search('dune');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('expires cached results', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => json({ docs: [] }));

    await service.search('dune');
    vi.advanceTimersByTime(config.cacheTtlMs + 1);
    await service.search('dune');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws ExternalServiceError on an error status, a network failure and a timeout', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 502));
    await expect(service.search('a1')).rejects.toThrow(ExternalServiceError);

    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(service.search('a2')).rejects.toThrow(ExternalServiceError);

    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    );
    await expect(service.search('a3')).rejects.toMatchObject({ context: { reason: 'Request timeout' } });
  });

  it('does not cache failures', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json({ docs: [{ title: 'Dune' }] }));

    await expect(service.search('dune')).rejects.toThrow(ExternalServiceError);
    expect(await service.search('dune')).toHaveLength(1);
  });
});
