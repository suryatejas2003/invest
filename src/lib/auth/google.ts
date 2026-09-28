import { env, features } from '@/lib/env';
import { badRequest } from '@/lib/errors';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const googleEnabled = features.googleAuth;
export const redirectUri = () => `${env.APP_URL}/api/auth/google/callback`;

export function buildAuthUrl(state: string, role?: string) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
    ...(role ? { login_hint: '' } : {}),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

/**
 * The code is exchanged directly with Google over TLS using our client secret,
 * so the returned id_token arrives through a trusted channel and does not need
 * local signature verification (Google documents this exception for the
 * authorization-code flow). We still check issuer, audience and expiry.
 */
export async function exchangeCode(code: string): Promise<GoogleIdentity> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) throw badRequest('Google sign-in failed. Try again or use your email address.');
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw badRequest('Google sign-in returned no identity.');

  const payloadPart = data.id_token.split('.')[1];
  if (!payloadPart) throw badRequest('Google sign-in returned a malformed identity.');
  const claims = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as Record<string, unknown>;

  const iss = String(claims.iss ?? '');
  const aud = String(claims.aud ?? '');
  const exp = Number(claims.exp ?? 0);

  if (!['https://accounts.google.com', 'accounts.google.com'].includes(iss)) throw badRequest('Unexpected identity issuer.');
  if (aud !== env.GOOGLE_CLIENT_ID) throw badRequest('Identity was issued for a different application.');
  if (exp * 1000 < Date.now()) throw badRequest('Google sign-in expired. Try again.');

  return {
    sub: String(claims.sub),
    email: String(claims.email ?? '').toLowerCase(),
    emailVerified: claims.email_verified === true,
    name: claims.name ? String(claims.name) : undefined,
    picture: claims.picture ? String(claims.picture) : undefined,
  };
}
