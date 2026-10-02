import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { UserModel } from '../database/models/user.js';
import { authenticate } from './middleware.js';
import { createAccessToken, hashPassword, verifyPassword } from './service.js';
import type { AuthenticatedRequest } from './types.js';

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const registrationSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  confirmPassword: z.string().min(8).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(32).optional().or(z.literal('')),
});

const publicUser = (user: { _id: { toString: () => string }; name: string; email: string; phone?: string | null; role: string; status: string }) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone ?? '',
  role: user.role,
  status: user.status,
});

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

export const authRouter = Router();

export const registerHandler = async (request: Request, response: Response): Promise<void> => {
  try {
    const parsed = registrationSchema.safeParse(request.body);

    if (!parsed.success) {
      const passwordMismatch = parsed.error.issues.some((issue) => issue.path.includes('confirmPassword'));
      response.status(400).json({ error: passwordMismatch ? 'Passwords do not match' : 'Valid name, phone, email, and password details are required' });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const phone = parsed.data.phone.trim();
    const existingUser = await UserModel.exists({ $or: [{ email }, { phone }] });
    if (existingUser) {
      response.status(409).json({ error: 'An account with that email or phone number already exists' });
      return;
    }

    const user = await UserModel.create({
      name: parsed.data.name,
      email,
      phone,
      passwordHash: await hashPassword(parsed.data.password),
    });

    response.status(201).json({ user: publicUser(user), accessToken: createAccessToken({ id: user._id.toString(), role: user.role }) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      response.status(409).json({ error: 'An account with that email or phone number already exists' });
      return;
    }
    console.error('Registration failed:', error);
    response.status(500).json({ error: 'Registration could not be completed' });
  }
};

export const loginHandler = async (request: Request, response: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: 'Valid email and password are required' });
      return;
    }

    const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
    const passwordMatches = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

    if (!user || !passwordMatches || user.status !== 'active') {
      response.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();
    response.json({ user: publicUser(user), accessToken: createAccessToken({ id: user._id.toString(), role: user.role }) });
  } catch (error) {
    console.error('Login failed:', error);
    response.status(500).json({ error: 'Login could not be completed' });
  }
};

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);

authRouter.get('/me', authenticate, async (request: AuthenticatedRequest, response) => {
  const user = await UserModel.findById(request.user?.id);

  if (!user || user.status !== 'active') {
    response.status(401).json({ error: 'User account is unavailable' });
    return;
  }

  response.json({ user: publicUser(user) });
});

export const updateProfileHandler = async (request: AuthenticatedRequest, response: Response): Promise<void> => {
  const parsed = profileSchema.safeParse(request.body);
  if (!parsed.success || !request.user?.id) {
    response.status(400).json({ error: 'Valid name, email, and phone details are required' });
    return;
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const duplicate = await UserModel.exists({ email, _id: { $ne: request.user.id } });
    if (duplicate) {
      response.status(409).json({ error: 'An account with that email already exists' });
      return;
    }
    const user = await UserModel.findById(request.user.id);
    if (!user || user.status !== 'active') {
      response.status(404).json({ error: 'User account is unavailable' });
      return;
    }
    user.name = parsed.data.name;
    user.email = email;
    user.phone = parsed.data.phone || null;
    await user.save();
    response.json({ user: publicUser(user) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      response.status(409).json({ error: 'That email or phone number is already in use' });
      return;
    }
    console.error('Profile update failed:', error);
    response.status(500).json({ error: 'Account details could not be updated' });
  }
};

authRouter.patch('/me', authenticate, updateProfileHandler);
