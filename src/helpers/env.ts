import dotenv from 'dotenv';
import { EnvVars } from '../config/loadEnv';

dotenv.config();
export const env = (key: EnvVars) => {
  const value = process.env[key]!;
  return value;
}