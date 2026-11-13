import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { migrate as migrateNeon } from 'drizzle-orm/neon-serverless/migrator';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

// WebSockets use HTTPS port 443 while retaining interactive transactions.
// Standard PostgreSQL connections remain the default.
const connect = () => {
  const options = { connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 };
  if (env.DATABASE_TRANSPORT === 'websocket') {
    neonConfig.webSocketConstructor = WebSocket;
    const pool = new NeonPool(options);
    const db = drizzleNeon(pool, { schema });
    return { pool, db, runMigrations: () => migrateNeon(db, { migrationsFolder: 'drizzle' }) };
  }
  const pool = new pg.Pool(options);
  const db = drizzle(pool, { schema });
  return { pool, db, runMigrations: () => migrate(db, { migrationsFolder: 'drizzle' }) };
};

export const { pool, db, runMigrations } = connect();

export type Database = typeof db;
export type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export { schema };
