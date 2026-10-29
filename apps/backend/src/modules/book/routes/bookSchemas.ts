import { Type, type Static } from '@fastify/type-provider-typebox';

export const bookLanguageSchema = Type.Union([Type.Literal('en'), Type.Literal('es')]);

export const bookSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  author: Type.Union([Type.String(), Type.Null()]),
  language: bookLanguageSchema,
  wordCount: Type.Number(),
  createdAt: Type.String({ format: 'date-time' }),
});

export const bookIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const createBookRequestSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 255 }),
  author: Type.Optional(Type.String({ maxLength: 255 })),
  language: bookLanguageSchema,
});

export const updateBookRequestSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  author: Type.Optional(Type.Union([Type.String({ maxLength: 255 }), Type.Null()])),
});

export const booksResponseSchema = Type.Object({
  data: Type.Array(bookSchema),
});

export type BookDto = Static<typeof bookSchema>;
