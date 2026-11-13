import { vi } from 'vitest';

process.env.DATABASE_URL = 'pglite://test';
process.env.NODE_ENV = 'test';
process.env.AUTH_SECRET = 'test-secret-test-secret-test-secret-123';

vi.mock('../db/index', () => import('./testDb'));
vi.mock('morgan', () => ({ default: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
