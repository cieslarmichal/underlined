import { Type, type Static } from '@fastify/type-provider-typebox';

export const captureItemSchema = Type.Object({
  lemma: Type.String(),
  surfaceForm: Type.String(),
  translation: Type.String(),
});

export const captureSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  bookId: Type.String({ format: 'uuid' }),
  status: Type.Union([
    Type.Literal('pending_review'),
    Type.Literal('accepted'),
    Type.Literal('rejected'),
    Type.Literal('failed'),
  ]),
  items: Type.Array(captureItemSchema),
  createdAt: Type.String({ format: 'date-time' }),
});

export const bookIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const captureIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const capturesQuerySchema = Type.Object({
  status: Type.Optional(Type.Literal('pending_review')),
});

export const capturesResponseSchema = Type.Object({
  data: Type.Array(captureSchema),
});

export type CaptureDto = Static<typeof captureSchema>;
