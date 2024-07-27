import { logger } from '../helpers/Logger';
import { env } from '../helpers/env';

export enum EnvVars {
  PORT = "PORT",
  NODE_ENV = "NODE_ENV",
  MONGO_URL = 'MONGO_URL',
  ACCESS_TOKEN = 'ACCESS_TOKEN',
  PHONE_NUMBER_ID = 'PHONE_NUMBER_ID',
  WEBHOOK_VERIFICATION_TOKEN = 'WEBHOOK_VERIFICATION_TOKEN',
}

export const validateEnv = () => {
  for (const key in EnvVars) {
    const k = key as EnvVars;
    if (!env(EnvVars[k])) {
      throw new Error(`${EnvVars[k]} is required`);
    }
  }

  logger.log(`============================`);
  logger.log('ENV variables loaded')
  logger.log(`============================`);
}
