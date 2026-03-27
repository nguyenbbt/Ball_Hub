import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/ballhub';
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
};
