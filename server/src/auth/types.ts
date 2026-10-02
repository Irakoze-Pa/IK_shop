import type { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  role: 'customer' | 'admin';
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};