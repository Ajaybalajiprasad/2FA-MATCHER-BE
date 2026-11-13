import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is missing: copy .env.example to .env and set it' })
    .min(1),
  DATA_DIR: z.string().default('hackathon-problem-3-group-travel-matcher/data'),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  DATA_DIR: path.resolve(process.cwd(), parsed.DATA_DIR),
};
