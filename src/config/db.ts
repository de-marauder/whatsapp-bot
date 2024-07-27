import mongoose from 'mongoose';
import { env } from '../helpers/env';
import { EnvVars } from './loadEnv';

const MONGO_URI = env(EnvVars.MONGO_URL);

export const startDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {});
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit process with failure code
  }
};
// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose disconnected due to application termination');
  process.exit(0);
});

export default startDB;
