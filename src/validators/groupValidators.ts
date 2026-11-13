import { z } from 'zod';
import { GENDER_PREFERENCES, GROUP_SIZE } from '../config/businessRules';

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1),
  checkIn: z.string().trim(),
  checkOut: z.string().trim(),
  maxSize: z.number().int().min(GROUP_SIZE.MIN).max(GROUP_SIZE.MAX),
  budgetInr: z.number().int().positive(),
  itinerary: z.string().trim().min(1).max(2000),
  // Per trip; defaults to the owner's profile setting.
  genderPreference: z.enum(GENDER_PREFERENCES).optional(),
});

export const groupIdParamSchema = z.object({ id: z.string().min(1) });

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
