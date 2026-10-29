import { Type, type Static } from '@fastify/type-provider-typebox';

export const wordOccurrenceSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  bookId: Type.String({ format: 'uuid' }),
  bookTitle: Type.String(),
  surfaceForm: Type.String(),
  sentence: Type.String(),
  translation: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});

export const wordSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  lemma: Type.String(),
  sourceLanguage: Type.String(),
  targetLanguage: Type.String(),
  encounters: Type.Number(),
  known: Type.Boolean(),
  occurrences: Type.Array(wordOccurrenceSchema),
  createdAt: Type.String({ format: 'date-time' }),
});

export const wordsQuerySchema = Type.Object({
  bookId: Type.Optional(Type.String({ format: 'uuid' })),
  q: Type.Optional(Type.String({ maxLength: 100 })),
  sort: Type.Optional(Type.Union([Type.Literal('newest'), Type.Literal('frequent')])),
  status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('known'), Type.Literal('all')])),
  minEncounters: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});

export const rememberQuerySchema = Type.Object({
  bookId: Type.Optional(Type.String({ format: 'uuid' })),
});

export const rememberCardSchema = Type.Object({
  wordId: Type.String({ format: 'uuid' }),
  lemma: Type.String(),
  encounters: Type.Number(),
  sentence: Type.String(),
  surfaceForm: Type.String(),
  translation: Type.String(),
  bookTitle: Type.String(),
});

export const rememberResponseSchema = Type.Object({
  data: Type.Union([rememberCardSchema, Type.Null()]),
});

export const rememberRequestSchema = Type.Object({
  outcome: Type.Union([Type.Literal('recalled'), Type.Literal('not_yet'), Type.Literal('known')]),
});

export const knownRequestSchema = Type.Object({
  known: Type.Boolean(),
});

export const summaryResponseSchema = Type.Object({
  newWords: Type.Number(),
  metAgain: Type.Number(),
  totalWords: Type.Number(),
  knownWords: Type.Number(),
});

export const wordsResponseSchema = Type.Object({
  data: Type.Array(wordSchema),
});

export const wordIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const bookWordParamsSchema = Type.Object({
  bookId: Type.String({ format: 'uuid' }),
  wordId: Type.String({ format: 'uuid' }),
});

export const occurrenceIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const updateOccurrenceRequestSchema = Type.Object({
  translation: Type.String({ minLength: 1, maxLength: 500 }),
});

export type WordDto = Static<typeof wordSchema>;
