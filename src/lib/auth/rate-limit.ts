import { headers } from 'next/headers';
import { tooMany } from '@/lib/errors';

/**
 * Fixed-window counter held in process memory. Good enough for a single
 * node; the interface is deliberately narrow so it can be swapped for Redis
 * without touching call sites.
 */
interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

const LIMITS = {
  login: { max: 8, windowMs: 10 * 60_000 },
  signup: { max: 5, windowMs: 60 * 60_000 },
  passwordReset: { max: 5, windowMs: 60 * 60_000 },
  connectionRequest: { max: 25, windowMs: 24 * 60 * 60_000 },
  message: { max: 60, windowMs: 60 * 60_000 },
  introduction: { max: 10, windowMs: 24 * 60 * 60_000 },
  ai: { max: 30, windowMs: 60 * 60_000 },
  report: { max: 10, windowMs: 24 * 60 * 60_000 },
  search: { max: 120, windowMs: 60_000 },
} as const;

export type LimitName = keyof typeof LIMITS;

export function consume(name: LimitName, key: string): { ok: boolean; retryAfterMs: number } {
  const limit = LIMITS[name];
  const id = `${name}:${key}`;
  const now = Date.now();
  const existing = buckets.get(id);

  if (!existing || existing.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + limit.windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (existing.count >= limit.max) {
    return { ok: false, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

export async function clientKey(suffix?: string): Promise<string> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
  return suffix ? `${ip}|${suffix}` : ip;
}

export async function enforce(name: LimitName, suffix?: string) {
  const result = consume(name, await clientKey(suffix));
  if (!result.ok) {
    const mins = Math.ceil(result.retryAfterMs / 60_000);
    throw tooMany(`Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
  }
}

/** Test seam. */
export function _resetLimits() { buckets.clear(); }
