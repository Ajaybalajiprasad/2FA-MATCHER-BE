import { z } from 'zod';

export const createRequestSchema = z.object({ searchId: z.string().trim().min(1) });

export const listRequestsQuerySchema = z.object({
  status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

export const decideRequestSchema = z.object({ action: z.enum(['APPROVE', 'REJECT']) });

export const requestIdParamSchema = z.object({ requestId: z.string().min(1) });

export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
export type DecideRequestInput = z.infer<typeof decideRequestSchema>;
