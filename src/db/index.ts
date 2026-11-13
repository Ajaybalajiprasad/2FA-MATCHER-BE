// node-postgres instead of neon-http: works with any Postgres and supports transactions.
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export const runMigrations = () => migrate(db, { migrationsFolder: 'drizzle' });

export { schema };
