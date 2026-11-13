import { getTableName, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { db, pool, runMigrations, schema } from '../db';
import { seedDatabase } from '../db/seed';
import logger from '../utils/logger';

// Only this app's tables are dropped, so other data in the same database is untouched.
const tables = Object.values(schema)
  .filter((t) => is(t, PgTable))
  .map((t) => `"${getTableName(t as PgTable)}"`);

try {
  await db.execute(sql.raw(`DROP TABLE IF EXISTS ${tables.join(', ')} CASCADE`));
  await db.execute(sql`DROP TABLE IF EXISTS drizzle.__drizzle_migrations`);
  await runMigrations();
  await seedDatabase(db);
  logger.info('Database reset to the data pack');
} catch (error) {
  logger.error('Reset failed', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
