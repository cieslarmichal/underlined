import { ExternalServiceError } from '../errors/externalServiceError.ts';
import type { OpenRouterService } from '../openRouter/openRouterService.ts';
import type { ResponseFormat } from '../openRouter/types.ts';
import { languageNames } from '../types/language.ts';

import type { AnalyzePagePayload, PageAnalysisService, UnderlinedWord } from './pageAnalysisService.ts';

const responseFormat: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'underlined_words',
    strict: true,
    schema: {
      type: 'object',
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
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
};

interface RawItem {
  readonly surface_form?: unknown;
  readonly lemma?: unknown;
  readonly sentence?: unknown;
  readonly translation?: unknown;
}

export class OpenRouterPageAnalysisService implements PageAnalysisService {
  private readonly openRouterService: OpenRouterService;

  public constructor(openRouterService: OpenRouterService) {
    this.openRouterService = openRouterService;
  }

  public async analyzePage(payload: AnalyzePagePayload): Promise<UnderlinedWord[]> {
    const { data } = await this.openRouterService.sendRequest<{ items?: RawItem[] }>({
      systemMessage: this.buildSystemPrompt(payload),
      userMessage: [
        {
          type: 'image_url',
          image_url: { url: `data:${payload.imageMimeType};base64,${payload.image.toString('base64')}` },
        },
        { type: 'text', text: 'Find the hand-underlined words on this book page and report them.' },
      ],
      responseFormat,
    });

    if (!Array.isArray(data.items)) {
      throw new ExternalServiceError({
        service: 'OpenRouter API',
        reason: 'Model returned a malformed result',
        responseBody: data,
      });
    }

    const words: UnderlinedWord[] = [];

    for (const { surface_form, lemma, sentence, translation } of data.items) {
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
