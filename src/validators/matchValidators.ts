import { z } from 'zod';
import { GENDER_PREFERENCES, MATCH_RULES_CONFIG } from '../config/businessRules';
import { GENDER_MIXES } from '../utils/matchFilters';

export const matchSearchSchema = z.object({
  homeCity: z.string().trim().max(100).optional(),
  city: z.string().trim().min(1),
  checkIn: z.string().trim(),
  checkOut: z.string().trim(),
  budgetInr: z.number().int().positive(),
  interests: z.array(z.string()).min(1).max(16),
  genderPreference: z.enum(GENDER_PREFERENCES).optional(),
  filters: z
    .object({
      sharedInterests: z.array(z.string()).max(16).optional(),
      minSharedInterests: z.number().int().min(MATCH_RULES_CONFIG.MIN_SHARED_INTERESTS).max(16).optional(),
      genderMix: z.enum(GENDER_MIXES).optional(),
    })
    .optional(),
});

export type MatchSearchInput = z.infer<typeof matchSearchSchema>;
