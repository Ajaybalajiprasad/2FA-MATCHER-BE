import { db, pool, runMigrations } from '../db';
import { seedIfEmpty } from '../db/seed';
import logger from '../utils/logger';

try {
  await runMigrations();
  await seedIfEmpty(db);
} catch (error) {
  logger.error('Seed failed', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
