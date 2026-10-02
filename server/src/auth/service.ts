import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const passwordRounds = 12;

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, passwordRounds);

export const verifyPassword = (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);

export const createAccessToken = (user: { id: string; role: 'customer' | 'admin' }): string =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: '1h' });

export const verifyAccessToken = (token: string): { id: string; role: 'customer' | 'admin' } => {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload === 'string' || !payload.sub || (payload.role !== 'customer' && payload.role !== 'admin')) {
    throw new Error('Invalid access token');
  }

  return { id: payload.sub, role: payload.role };
};