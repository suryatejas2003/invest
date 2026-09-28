import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createToken, hashToken } from './tokens';
import { forbidden, unauthorized } from '@/lib/errors';

export const SESSION_COOKIE = 'doorkey_session';
const SESSION_DAYS = 30;
/** Sliding window: a session within this of expiry is extended on use. */
const REFRESH_WITHIN_DAYS = 7;

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  status: string;
  emailVerifiedAt: Date | null;
  onboardingCompletedAt: Date | null;
  profileId: string | null;
  displayName: string;
  photoUrl: string | null;
  slug: string | null;
}

export async function createSession(userId: string) {
  const { token, hash } = createToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const h = await headers();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt,
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: h.get('user-agent')?.slice(0, 255) ?? null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** Cached per request so a page with ten server components hits the DB once. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: { select: { id: true, displayName: true, photoUrl: true, slug: true } } } } },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== 'ACTIVE') return null;

  if (session.expiresAt.getTime() - Date.now() < REFRESH_WITHIN_DAYS * 864e5) {
    await prisma.session
      .update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) } })
      .catch(() => {});
  }

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    emailVerifiedAt: u.emailVerifiedAt,
    onboardingCompletedAt: u.onboardingCompletedAt,
    profileId: u.profile?.id ?? null,
    displayName: u.profile?.displayName ?? u.email.split('@')[0],
    photoUrl: u.profile?.photoUrl ?? null,
    slug: u.profile?.slug ?? null,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole('ADMIN');
}

/** Revoke every other session — used after a password change. */
export async function revokeOtherSessions(userId: string) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await prisma.session.deleteMany({
    where: { userId, ...(token ? { NOT: { tokenHash: hashToken(token) } } : {}) },
  });
}
