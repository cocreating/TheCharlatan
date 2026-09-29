import { expect, it } from 'vitest';
import { createRateLimiter } from './rateLimit';

it('allows `limit` requests per window and key, then reports when to retry', () => {
  const check = createRateLimiter({ limit: 2, windowMs: 60_000 });
  expect(check('a', 0).allowed).toBe(true);
  expect(check('a', 10_000).allowed).toBe(true);
  expect(check('a', 20_000)).toEqual({ allowed: false, retryAfter: 40 });
  expect(check('b', 20_000).allowed).toBe(true);
  // The first hit leaves the window at 60s
  expect(check('a', 60_000).allowed).toBe(true);
});
