import { z } from 'zod';

const id = z.string().trim().min(1).max(100);
export const friendRequestSchema = z.object({ travellerId: id }).strict();
export const friendTargetSchema = z.object({ travellerId: id });
export const friendRequestIdSchema = z.object({ id });
