import { describe, expect, it } from 'vitest';
import { createAccessToken, hashPassword, verifyAccessToken, verifyPassword } from './service.js';

describe('authentication service', () => {
  it('hashes passwords without preserving the plaintext', async () => {
    const password = 'correct-horse-battery-staple';
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(await verifyPassword(password, passwordHash)).toBe(true);
    expect(await verifyPassword('wrong-password', passwordHash)).toBe(false);
  });

  it('creates tokens containing only the authenticated identity claims', () => {
    const token = createAccessToken({ id: '507f1f77bcf86cd799439011', role: 'admin' });

    expect(verifyAccessToken(token)).toEqual({ id: '507f1f77bcf86cd799439011', role: 'admin' });
  });

  it('rejects tampered access tokens', () => {
    const token = createAccessToken({ id: '507f1f77bcf86cd799439011', role: 'customer' });

    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });
});