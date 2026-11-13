import { z } from 'zod';
import { GENDER_PREFERENCES, GENDERS } from '../config/businessRules';

export const signUpSchema = z.object({
  name: z.string().trim().min(1).max(100),
  age: z.number().int().min(18).max(100).optional(),
  gender: z.enum(GENDERS),
  homeCity: z.string().trim().min(1).max(100),
  homeAirport: z.string().trim().max(10).optional(),
  genderPreference: z.enum(GENDER_PREFERENCES),
  interests: z.array(z.string()).min(1).max(16),
});

export const travellerIdParamSchema = z.object({ id: z.string().min(1) });

export type SignUpInput = z.infer<typeof signUpSchema>;
