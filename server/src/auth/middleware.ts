import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './types.js';
import { verifyAccessToken } from './service.js';

export const authenticate = (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
  const header = request.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    request.user = verifyAccessToken(token);
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired access token' });
  }
};

export const requireRole = (...roles: Array<'customer' | 'admin'>) =>
  (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };