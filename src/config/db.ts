import mongoose from 'mongoose';
import { env } from '../helpers/env';
import { EnvVars } from './loadEnv';
import { logger } from '../helpers/Logger';

const MONGO_URI = env(EnvVars.MONGO_URL);

export const startDB = async () => {
  try {
    logger.log('===================================');
    await mongoose.connect(MONGO_URI, {});
    logger.log('Connected to MongoDB successfully');
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit process with failure code
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.log('Mongoose disconnected from MongoDB');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.log('Mongoose disconnected due to application termination');
  process.exit(0);
});

export default startDB;
