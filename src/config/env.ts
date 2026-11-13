import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_TRANSPORT: z.enum(['tcp', 'websocket']).default('tcp'),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is missing: copy .env.example to .env and set it' })
    .min(1),
  AUTH_SECRET: z.string({ required_error: 'AUTH_SECRET is missing: set a long random string in .env' }).min(32),
  // Seeded demo travellers sign in as <id>@demo.travel with this password.
  DEMO_PASSWORD: z.string().min(8).default('demo1234'),
  // Lets anyone sign in as a seeded traveller without a password. Turn off outside demos.
  DEMO_SWITCH: z.enum(['true', 'false']).default('true'),
  DATA_DIR: z.string().default('hackathon-problem-3-group-travel-matcher/data'),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  DATA_DIR: path.resolve(process.cwd(), parsed.DATA_DIR),
};
