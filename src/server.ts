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
    server.close(() => pool.end().finally(() => process.exit(0)));
    // Keep-alive connections would otherwise hold the port during nodemon restarts.
    server.closeAllConnections();
    setTimeout(() => process.exit(1), 3000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((error) => {
  logger.error('Failed to start', error);
  process.exit(1);
});
