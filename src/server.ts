import app from './app';
import { env } from './config/env';
import { db, pool, runMigrations } from './db';
import { seedIfEmpty } from './db/seed';
import logger from './utils/logger';

const start = async () => {
  await runMigrations();
  await seedIfEmpty(db);

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT}`);
    logger.info(`Health: http://localhost:${env.PORT}/health`);
  });

  const shutdown = () => {
    logger.info('Shutting down...');
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((error) => {
  logger.error('Failed to start', error);
  process.exit(1);
});
