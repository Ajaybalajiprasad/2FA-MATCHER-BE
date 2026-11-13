import type { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const toSchema = (schema: ZodSchema) => zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' });

export const jsonBody = (schema: ZodSchema, example?: unknown) => ({
  required: true,
  content: { 'application/json': { schema: toSchema(schema), example } },
});

export const ok = (description: string) => ({ description });

export const pathParam = (name: string, example: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
  example,
});

export const asUser = [{ userId: [] }];
