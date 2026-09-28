import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { buildAuthUrl, googleEnabled } from '@/lib/auth/google';

export async function GET() {
  if (!googleEnabled) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', process.env.APP_URL ?? 'http://localhost:3000'));
  }
  const state = randomBytes(16).toString('base64url');
  const jar = await cookies();
  jar.set('doorkey_oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600,
  });
  return NextResponse.redirect(buildAuthUrl(state));
}
