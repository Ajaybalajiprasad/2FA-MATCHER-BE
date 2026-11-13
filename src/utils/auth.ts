import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const sign = (payload: string) => createHmac('sha256', env.AUTH_SECRET).update(payload).digest('base64url');

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};

export const verifyPassword = (password: string, stored: string | null): boolean => {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
};

// Stateless signed token: base64url(JSON {sub, exp}).hmac
export const signToken = (travellerId: string, now = Date.now()): string => {
  const payload = b64(JSON.stringify({ sub: travellerId, exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS }));
  return `${payload}.${sign(payload)}`;
};

export const verifyToken = (token: string, now = Date.now()): string | undefined => {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return undefined;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: unknown; exp?: unknown };
    if (typeof sub !== 'string' || typeof exp !== 'number' || exp * 1000 < now) return undefined;
    return sub;
  } catch {
    return undefined;
  }
};
