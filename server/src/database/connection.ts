import mongoose from 'mongoose';
import { env } from '../config/env.js';

export type DatabaseStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

let databaseStatus: DatabaseStatus = 'disconnected';

mongoose.connection.on('connected', () => {
  databaseStatus = 'connected';
});

mongoose.connection.on('disconnected', () => {
  databaseStatus = 'disconnected';
});

mongoose.connection.on('error', () => {
  databaseStatus = 'error';
});

export const getDatabaseStatus = (): DatabaseStatus => databaseStatus;

export const connectDatabase = async (): Promise<void> => {
  if (databaseStatus === 'connected' || databaseStatus === 'connecting') {
    return;
  }

  databaseStatus = 'connecting';

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
  } catch (error) {
    databaseStatus = 'error';
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error(`MongoDB connection unavailable: ${message}`);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  databaseStatus = 'disconnected';
};