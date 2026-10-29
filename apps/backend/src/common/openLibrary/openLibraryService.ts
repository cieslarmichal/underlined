import { ExternalServiceError } from '../errors/externalServiceError.ts';
import type { BookLanguage } from '../types/language.ts';

import type { BookSuggestion, BookSuggestionService } from './bookSuggestionService.ts';

export interface OpenLibraryConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly userAgent: string;
  readonly maxSuggestions: number;
  readonly cacheTtlMs: number;
  readonly cacheMaxEntries: number;
}

interface OpenLibraryDoc {
  readonly title?: unknown;
  readonly author_name?: unknown;
  readonly first_publish_year?: unknown;
}

// Open Library names languages with ISO 639-2 codes.
const languageCodes: Record<BookLanguage, string> = { en: 'eng', es: 'spa' };

// Series volumes, box sets and anthologies are not a single book the reader holds.
const noisyTitle =
  /\((series|set|collection|omnibus)\)|\bbox(ed)? set\b|\bcomplete (collection|series)\b|\b\d+\s*-\s*\d+\b/i;

const dedupeKey = (title: string, author: string | null): string =>
  `${title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()}|${(author ?? '').toLowerCase()}`;

export class OpenLibraryService implements BookSuggestionService {
  private readonly config: OpenLibraryConfig;
  private readonly cache = new Map<string, { expiresAt: number; suggestions: BookSuggestion[] }>();

  public constructor(config: OpenLibraryConfig) {
    this.config = config;
  }

  public async search(query: string, language?: BookLanguage): Promise<BookSuggestion[]> {
    const cacheKey = `${language ?? ''}|${query.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.suggestions;
    }

    const suggestions = this.toSuggestions(await this.fetchDocs(query, language));

    this.remember(cacheKey, suggestions);

    return suggestions;
  }

  private async fetchDocs(query: string, language?: BookLanguage): Promise<OpenLibraryDoc[]> {
    const params = new URLSearchParams({
      q: query,
      limit: String(this.config.maxSuggestions * 3),
      fields: 'title,author_name,first_publish_year',
    });

    if (language) {
      params.set('language', languageCodes[language]);
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/search.json?${params.toString()}`, {
        headers: { 'User-Agent': this.config.userAgent, Accept: 'application/json' },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new ExternalServiceError({
          service: 'Open Library',
          reason: `Open Library request failed with status ${response.status.toString()}`,
          statusCode: response.status,
        });
      }

      const body = (await response.json()) as { docs?: OpenLibraryDoc[] };

      return Array.isArray(body.docs) ? body.docs : [];
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError({
        service: 'Open Library',
        reason: error instanceof Error && error.name === 'AbortError' ? 'Request timeout' : 'Request failed',
        originalError: error,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private toSuggestions(docs: OpenLibraryDoc[]): BookSuggestion[] {
    const seen = new Set<string>();
    const suggestions: BookSuggestion[] = [];

    for (const doc of docs) {
      if (typeof doc.title !== 'string' || !doc.title.trim() || noisyTitle.test(doc.title)) {
        continue;
      }

      const title = doc.title.trim();
      const firstAuthor = Array.isArray(doc.author_name) ? doc.author_name[0] : undefined;
      const author = typeof firstAuthor === 'string' && firstAuthor.trim() ? firstAuthor.trim() : null;
      const key = dedupeKey(title, author);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      suggestions.push({
        title,
        author,
        year: typeof doc.first_publish_year === 'number' ? doc.first_publish_year : null,
      });

      if (suggestions.length >= this.config.maxSuggestions) {
        break;
      }
    }

    return suggestions;
  }

  private remember(key: string, suggestions: BookSuggestion[]): void {
    if (this.cache.size >= this.config.cacheMaxEntries) {
      const oldest = this.cache.keys().next();

      if (!oldest.done) {
        this.cache.delete(oldest.value);
      }
    }

    this.cache.set(key, { expiresAt: Date.now() + this.config.cacheTtlMs, suggestions });
  }
}
