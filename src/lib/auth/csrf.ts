import { headers } from 'next/headers';
import { env } from '@/lib/env';
import { forbidden } from '@/lib/errors';

/**
 * Session cookies are SameSite=Lax, which already blocks cross-site POSTs from
 * forms. This adds an origin check as defence in depth for state-changing
 * requests, which is the pattern Next.js server actions use internally.
 */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  if (!origin) return; // same-origin navigations and server-side calls
  const allowed = new URL(env.APP_URL).origin;
  if (origin !== allowed) throw forbidden('Request blocked: unexpected origin.');
}
