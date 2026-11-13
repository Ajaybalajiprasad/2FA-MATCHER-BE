import { describe, expect, it } from 'vitest';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../auth';

describe('auth utils', () => {
  it('verifies the right password only', () => {
    const stored = hashPassword('secret-pass');
    expect(verifyPassword('secret-pass', stored)).toBe(true);
    expect(verifyPassword('wrong-pass', stored)).toBe(false);
    expect(verifyPassword('secret-pass', null)).toBe(false);
  });

  it('round-trips a token and rejects tampering and expiry', () => {
    const token = signToken('T-001');
    expect(verifyToken(token)).toBe('T-001');
    const [payload, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'T-002', exp: 9e9 })).toString('base64url');
    expect(verifyToken(`${forged}.${sig}`)).toBeUndefined();
    expect(verifyToken(`${payload}.x${sig.slice(1)}`)).toBeUndefined();
    expect(verifyToken(token, Date.now() + 8 * 24 * 3600 * 1000)).toBeUndefined();
  });
});
