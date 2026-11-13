import { z } from 'zod';
import { GENDER_PREFERENCES } from '../config/businessRules';

export const matchSearchSchema = z.object({
  homeCity: z.string().trim().max(100).optional(),
  city: z.string().trim().min(1),
  checkIn: z.string().trim(),
  checkOut: z.string().trim(),
  budgetInr: z.number().int().positive(),
  interests: z.array(z.string()).min(1).max(16),
  genderPreference: z.enum(GENDER_PREFERENCES).optional(),
});

export type MatchSearchInput = z.infer<typeof matchSearchSchema>;
