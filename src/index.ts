import app from './app';
import { startDB } from './config/db';
import { EnvVars, validateEnv } from './config/loadEnv';
import { logger } from './helpers/Logger';
import { env } from './helpers/env';

const port = env(EnvVars.PORT) || 8000;

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

startDB().then(() => {
  validateEnv();
  app.listen(port, () => {
    logger.log(`===================================`);
    logger.log(`Server is running on port ${port}`);
    logger.log(`===================================`);
  });
}).catch((error: Error) => {
  logger.error('Unable to connect to the database:', error);
});