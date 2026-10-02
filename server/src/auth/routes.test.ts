import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userStore = vi.hoisted(() => ({
  exists: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../database/models/user.js', () => ({ UserModel: userStore }));

import { loginHandler, registerHandler, updateProfileHandler } from './routes.js';
import type { AuthenticatedRequest } from './types.js';
import { hashPassword } from './service.js';

const customerId = '507f1f77bcf86cd799439011';
const customer = <T extends Record<string, unknown>>(overrides?: T) => ({
  _id: { toString: () => customerId },
  name: 'Jane Builder',
  email: 'jane@example.com',
  role: 'customer',
  status: 'active',
  ...overrides,
});

describe('authentication routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const invoke = async (handler: typeof registerHandler | typeof loginHandler, body: unknown) => {
    let status = 200;
    let payload: unknown;
    const response = {
      status: vi.fn((nextStatus: number) => { status = nextStatus; return response; }),
      json: vi.fn((nextPayload: unknown) => { payload = nextPayload; return response; }),
    } as unknown as Response;
    await handler({ body } as Request, response);
    return { status, payload };
  };

  it('creates a customer account and does not accept a browser-supplied role', async () => {
    userStore.exists.mockResolvedValue(null);
    userStore.create.mockImplementation(async (input: Record<string, unknown>) => customer({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
    }));

    const response = await invoke(registerHandler, { name: 'Jane Builder', phone: '+250788000000', email: 'JANE@EXAMPLE.COM', password: 'safe-password', confirmPassword: 'safe-password', role: 'admin' });
    const payload = response.payload as { user: { role: string; email: string }; accessToken: string };

    expect(response.status).toBe(201);
    expect(payload.user).toMatchObject({ role: 'customer', email: 'jane@example.com' });
    expect(payload.accessToken).toEqual(expect.any(String));
    expect(userStore.create).toHaveBeenCalledWith(expect.not.objectContaining({ role: 'admin' }));
    expect(userStore.create).toHaveBeenCalledWith(expect.objectContaining({ phone: '+250788000000', passwordHash: expect.any(String) }));
    expect(userStore.create.mock.calls[0]?.[0].passwordHash).not.toBe('safe-password');
  });

  it('rejects duplicate account creation', async () => {
    userStore.exists.mockResolvedValue({ _id: customerId });

    const response = await invoke(registerHandler, { name: 'Jane Builder', phone: '+250788000000', email: 'jane@example.com', password: 'safe-password', confirmPassword: 'safe-password' });

    expect(response.status).toBe(409);
    expect(response.payload).toEqual({ error: 'An account with that email or phone number already exists' });
    expect(userStore.create).not.toHaveBeenCalled();
  });

  it('returns a conflict when concurrent registration reaches the unique email constraint', async () => {
    userStore.exists.mockResolvedValue(null);
    userStore.create.mockRejectedValue({ code: 11000 });

    const response = await invoke(registerHandler, { name: 'Jane Builder', phone: '+250788000000', email: 'jane@example.com', password: 'safe-password', confirmPassword: 'safe-password' });

    expect(response.status).toBe(409);
    expect(response.payload).toEqual({ error: 'An account with that email or phone number already exists' });
  });

  it('logs in an active customer and records the login time', async () => {
    const storedUser = {
      ...customer(),
      passwordHash: await hashPassword('safe-password'),
      lastLoginAt: undefined as Date | undefined,
      save: vi.fn().mockResolvedValue(undefined),
    };
    userStore.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(storedUser) });

    const response = await invoke(loginHandler, { email: 'JANE@EXAMPLE.COM', password: 'safe-password' });
    const payload = response.payload as { user: { id: string }; accessToken: string };

    expect(response.status).toBe(200);
    expect(payload.user.id).toBe(customerId);
    expect(payload.accessToken).toEqual(expect.any(String));
    expect(storedUser.lastLoginAt).toBeInstanceOf(Date);
    expect(storedUser.save).toHaveBeenCalledOnce();
  });

  it('returns the same error for an unknown account and an incorrect password', async () => {
    userStore.findOne
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue(customer({ passwordHash: await hashPassword('safe-password') })) });

    const unknown = await invoke(loginHandler, { email: 'missing@example.com', password: 'safe-password' });
    const incorrect = await invoke(loginHandler, { email: 'jane@example.com', password: 'wrong-password' });

    expect(unknown.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(unknown.payload).toEqual({ error: 'Invalid credentials' });
    expect(incorrect.payload).toEqual({ error: 'Invalid credentials' });
  });

  it('rejects malformed account and login submissions', async () => {
    const registration = await invoke(registerHandler, { name: 'J', phone: '12', email: 'not-an-email', password: 'short', confirmPassword: 'different' });
    const login = await invoke(loginHandler, { email: 'not-an-email', password: 'short' });

    expect(registration.status).toBe(400);
    expect(login.status).toBe(400);
  });

  it('rejects registration when password confirmation does not match', async () => {
    const response = await invoke(registerHandler, { name: 'Jane Builder', phone: '+250788000000', email: 'jane@example.com', password: 'safe-password', confirmPassword: 'other-password' });

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({ error: 'Passwords do not match' });
    expect(userStore.create).not.toHaveBeenCalled();
  });

  it('updates only validated customer profile fields', async () => {
    const storedUser = { ...customer({ phone: '' }), save: vi.fn().mockResolvedValue(undefined) };
    userStore.exists.mockResolvedValue(null);
    userStore.findById.mockResolvedValue(storedUser);
    let payload: unknown;
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn((value: unknown) => { payload = value; }) } as unknown as Response;

    await updateProfileHandler({ body: { name: 'Jane Contractor', email: 'JANE.NEW@example.com', phone: '+250788000000', role: 'admin' }, user: { id: customerId, role: 'customer' } } as AuthenticatedRequest, response);

    expect(storedUser).toMatchObject({ name: 'Jane Contractor', email: 'jane.new@example.com', phone: '+250788000000', role: 'customer' });
    expect(storedUser.save).toHaveBeenCalledOnce();
    expect(payload).toMatchObject({ user: { name: 'Jane Contractor', phone: '+250788000000', role: 'customer' } });
  });

  it('rejects a profile email already owned by another account', async () => {
    userStore.exists.mockResolvedValue({ _id: '507f1f77bcf86cd799439012' });
    let status = 200;
    let payload: unknown;
    const response = { status: vi.fn((value: number) => { status = value; return response; }), json: vi.fn((value: unknown) => { payload = value; }) } as unknown as Response;

    await updateProfileHandler({ body: { name: 'Jane Builder', email: 'used@example.com', phone: '' }, user: { id: customerId, role: 'customer' } } as AuthenticatedRequest, response);

    expect(status).toBe(409);
    expect(payload).toEqual({ error: 'An account with that email already exists' });
    expect(userStore.findById).not.toHaveBeenCalled();
  });
});
