import { z } from 'zod';

export const messagesQuerySchema = z.object({
  after: z.string().datetime({ offset: true }).pipe(z.coerce.date()).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const messageBodySchema = z.object({ body: z.string().trim().min(1).max(1000) });

export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
