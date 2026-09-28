import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, googleEnabled } from '@/lib/auth/google';
import { signInWithGoogle } from '@/server/auth';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const base = env.APP_URL;
  if (!googleEnabled) return NextResponse.redirect(new URL('/login', base));

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const jar = await cookies();
  const expected = jar.get('doorkey_oauth_state')?.value;
  jar.delete('doorkey_oauth_state');

  // State must match, or this is a forged callback.
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL('/login?error=oauth_state', base));
  }

  try {
    const identity = await exchangeCode(code);
    const user = await signInWithGoogle(identity);
    return NextResponse.redirect(new URL(user.onboardingCompletedAt ? '/dashboard' : '/onboarding', base));
  } catch (err) {
    console.error('[oauth] google callback failed', err);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', base));
  }
}
