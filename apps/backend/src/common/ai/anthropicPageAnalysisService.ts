import Anthropic from '@anthropic-ai/sdk';

import type { Config } from '../../core/config.ts';
import { ExternalServiceError } from '../errors/externalServiceError.ts';
import { languageNames } from '../types/language.ts';

import type { AnalyzePagePayload, PageAnalysisService, UnderlinedWord } from './pageAnalysisService.ts';

const toolName = 'report_underlined_words';

const toolInputSchema = {
  type: 'object' as const,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          surface_form: { type: 'string' },
          lemma: { type: 'string' },
          sentence: { type: 'string' },
          translation: { type: 'string' },
        },
        required: ['surface_form', 'lemma', 'sentence', 'translation'],
      },
    },
  },
  required: ['items'],
};

const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export class AnthropicPageAnalysisService implements PageAnalysisService {
  private readonly client: Anthropic;
  private readonly config: Config['anthropic'];

  public constructor(config: Config['anthropic']) {
    this.config = config;
    this.client = new Anthropic({ apiKey: config.apiKey, timeout: config.timeoutMs, maxRetries: 1 });
  }

  public async analyzePage(payload: AnalyzePagePayload): Promise<UnderlinedWord[]> {
    const mediaType = supportedMimeTypes.find((type) => type === payload.imageMimeType);

    if (!mediaType) {
      throw new ExternalServiceError({
        service: 'Anthropic',
        reason: `Unsupported image type: ${payload.imageMimeType}`,
      });
    }

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: this.buildSystemPrompt(payload),
        tools: [
          {
            name: toolName,
            description: 'Report every hand-underlined word or phrase found on the page.',
            input_schema: toolInputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: toolName },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: payload.image.toString('base64') },
              },
              { type: 'text', text: 'Find the hand-underlined words on this book page and report them.' },
            ],
          },
        ],
      });

      const toolUse = response.content.find((block) => block.type === 'tool_use');

      if (!toolUse) {
        throw new Error('Model returned no tool call');
      }

      return this.parseItems(toolUse.input);
    } catch (error) {
      throw new ExternalServiceError({
        service: 'Anthropic',
        reason: error instanceof Error ? error.message : 'Unknown error',
        originalError: error,
      });
    }
  }

  private parseItems(input: unknown): UnderlinedWord[] {
    const items = (input as { items?: unknown } | null)?.items;

    if (!Array.isArray(items)) {
      throw new Error('Model returned malformed result');
    }

    const words: UnderlinedWord[] = [];

    for (const item of items as Record<string, unknown>[]) {
      const { surface_form, lemma, sentence, translation } = item;

      if (
        typeof surface_form === 'string' &&
        typeof lemma === 'string' &&
        typeof sentence === 'string' &&
        typeof translation === 'string' &&
        lemma.trim() &&
        translation.trim()
      ) {
        words.push({
          surfaceForm: surface_form.trim(),
          lemma: lemma.trim(),
          sentence: sentence.trim(),
          translation: translation.trim(),
        });
      }
    }

    return words;
  }

  private buildSystemPrompt(payload: AnalyzePagePayload): string {
    const bookLanguage = languageNames[payload.bookLanguage];
    const nativeLanguage = languageNames[payload.nativeLanguage];
    const author = payload.bookAuthor ? ` by ${payload.bookAuthor}` : '';

    return `You help a reader who reads a paper book in ${bookLanguage} and speaks ${nativeLanguage}.
The book is "${payload.bookTitle}"${author}. The photo shows one page; the reader underlined unknown words by hand (pencil, pen or highlighter).

Report ONLY words or phrases that are underlined or highlighted by hand. Ignore printed formatting, italics and words that are not marked. A multi-word expression (for example a phrasal verb) is one item.

For every item return:
- surface_form: the word exactly as written in the text, spelled correctly (never a misread version of an unusual word).
- lemma: the dictionary form of the word. Lowercase, except proper nouns and terms invented in the book. Invented words have no inflection, so the lemma equals the surface form. Keep the part of speech: an adjective stays an adjective (renowned stays renowned).
- sentence: the whole sentence from the book containing the word, in ${bookLanguage}, copied exactly. If the sentence is cut off by the page edge, return the visible part.
- translation: the meaning of the word IN THIS SENTENCE, in ${nativeLanguage}, in dictionary form (for example "staunchest" becomes the translation of "staunch", not of the superlative). Give one to three synonyms separated by commas, with no commentary.

Terms from the book's world (invented words, objects, names): use the official ${nativeLanguage} translation if one exists and add a short explanation in parentheses. If there is no equivalent, give a single short explanatory sentence as the translation.

If nothing on the page is underlined, return an empty list.`;
  }
}
