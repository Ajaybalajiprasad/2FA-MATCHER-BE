import { z } from 'zod';

export const groupHotelsQuerySchema = z.object({
  sort: z.enum(['price', 'rating', 'stars']).default('price'),
  minStars: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  preview: z.literal('full').optional(),
});

export const roomIdBodySchema = z.object({ roomId: z.string().trim().min(1) });

export const savedRoomParamSchema = z.object({ id: z.string().min(1), roomId: z.string().min(1) });

export type GroupHotelsQuery = z.infer<typeof groupHotelsQuerySchema>;
