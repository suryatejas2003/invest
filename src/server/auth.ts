import 'server-only';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createToken, hashToken } from '@/lib/auth/tokens';
import { createSession } from '@/lib/auth/session';
import { badRequest, conflict, unauthorized } from '@/lib/errors';
import { emails } from '@/lib/services/email';
import { track } from '@/lib/services/analytics';
import { audit } from '@/lib/services/audit';
import { slugify } from '@/lib/utils/format';
import type { Role } from '@prisma/client';

const VERIFY_TTL_MS = 24 * 60 * 60_000;
const RESET_TTL_MS = 60 * 60_000;

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'member';
  for (let i = 0; i < 40; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const taken = await prisma.profile.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function registerUser(input: { email: string; password: string; displayName: string; role: Role }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw conflict('An account with that email already exists. Sign in instead.');

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      profile: { create: { displayName: input.displayName, slug: await uniqueSlug(input.displayName) } },
      verifications: { create: { type: 'EMAIL', status: 'PENDING' } },
    },
  });

  const { token, hash } = createToken();
  await prisma.authToken.create({
    data: { userId: user.id, type: 'EMAIL_VERIFICATION', tokenHash: hash, expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
  });

  await emails.welcome(user.email, input.displayName);
  await emails.verifyEmail(user.email, token);
  await createSession(user.id);
  await track('signup', user.id, { role: input.role, method: 'password' });
  await audit({ actorId: user.id, action: 'user.signup', entityType: 'User', entityId: user.id });

  return user;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, status: true } });
  const ok = await verifyPassword(password, user?.passwordHash ?? null);

  // Same message either way: never reveal whether an address is registered.
  if (!user || !ok) throw unauthorized('That email and password do not match.');
  if (user.status === 'SUSPENDED') throw unauthorized('This account is suspended. Contact support@doorkey.app.');
  if (user.status === 'DELETED') throw unauthorized('That email and password do not match.');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit({ actorId: user.id, action: 'user.login', entityType: 'User', entityId: user.id });
  return user.id;
}

export async function signInWithGoogle(identity: { sub: string; email: string; emailVerified: boolean; name?: string; picture?: string }) {
  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: identity.sub }, { email: identity.email }] } });

  if (user) {
    if (user.status !== 'ACTIVE') throw unauthorized('This account is not available.');
    if (!user.googleId) user = await prisma.user.update({ where: { id: user.id }, data: { googleId: identity.sub } });
  } else {
    const name = identity.name || identity.email.split('@')[0];
    user = await prisma.user.create({
      data: {
        email: identity.email,
        googleId: identity.sub,
        emailVerifiedAt: identity.emailVerified ? new Date() : null,
        profile: { create: { displayName: name, slug: await uniqueSlug(name), photoUrl: identity.picture ?? null } },
        verifications: { create: { type: 'EMAIL', status: identity.emailVerified ? 'VERIFIED' : 'PENDING' } },
      },
    });
    await track('signup', user.id, { method: 'google' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  return user;
}

export async function startPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, status: true } });
  // Always report success — the response must not confirm that an account exists.
  if (!user || user.status !== 'ACTIVE') return;

  await prisma.authToken.updateMany({
    where: { userId: user.id, type: 'PASSWORD_RESET', usedAt: null },
    data: { usedAt: new Date() },
  });

  const { token, hash } = createToken();
  await prisma.authToken.create({
    data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash: hash, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  await emails.passwordReset(user.email, token);
}

export async function completePasswordReset(token: string, password: string) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('That reset link has expired. Ask for a new one.');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  await audit({ actorId: record.userId, action: 'user.password_reset', entityType: 'User', entityId: record.userId });
  return record.userId;
}

export async function verifyEmailToken(token: string) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'EMAIL_VERIFICATION' || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('That confirmation link has expired. Ask for a new one from your settings.');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.verification.upsert({
      where: { userId_type: { userId: record.userId, type: 'EMAIL' } },
      create: { userId: record.userId, type: 'EMAIL', status: 'VERIFIED' },
      update: { status: 'VERIFIED' },
    }),
  ]);
  return record.userId;
}

export async function resendVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } });
  if (!user || user.emailVerifiedAt) return;
  const { token, hash } = createToken();
  await prisma.authToken.create({
    data: { userId, type: 'EMAIL_VERIFICATION', tokenHash: hash, expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
  });
  await emails.verifyEmail(user.email, token);
}
