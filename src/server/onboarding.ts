import 'server-only';
import { prisma } from '@/lib/db';
import { badRequest } from '@/lib/errors';
import { slugify } from '@/lib/utils/format';
import { track } from '@/lib/services/analytics';
import { recomputeCompletion } from './profiles';
import type { Role } from '@prisma/client';

export const ENTREPRENEUR_STEPS = ['You', 'Your startup', 'Funding', 'Traction', 'Goals'] as const;
export const INVESTOR_STEPS = ['You', 'How you invest', 'What you back', 'Expertise'] as const;

export function stepsFor(role: Role) {
  return role === 'INVESTOR' ? INVESTOR_STEPS : ENTREPRENEUR_STEPS;
}

export async function setRole(userId: string, role: Role) {
  if (role === 'ADMIN') throw badRequest('That role cannot be chosen.');
  const user = await prisma.user.update({ where: { id: userId }, data: { role } });

  if (role === 'INVESTOR') {
    const profile = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (profile) {
      await prisma.investorProfile.upsert({
        where: { profileId: profile.id },
        create: { profileId: profile.id, investorType: 'ANGEL', expertise: [] },
        update: {},
      });
    }
  } else {
    const profile = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (profile) {
      await prisma.entrepreneurProfile.upsert({
        where: { profileId: profile.id },
        create: { profileId: profile.id, goals: [] },
        update: {},
      });
    }
  }
  return user;
}

export async function advanceStep(userId: string, step: number) {
  return prisma.user.update({ where: { id: userId }, data: { onboardingStep: step } });
}

export async function completeOnboarding(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { onboardingCompletedAt: new Date(), onboardingStep: 99 } });
  const percent = await recomputeCompletion(userId);
  await track('onboarding_completed', userId);
  if (percent >= 80) await track('profile_completed', userId);
  return percent;
}

export async function uniqueStartupSlug(name: string) {
  const root = slugify(name) || 'startup';
  for (let i = 0; i < 40; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const taken = await prisma.startup.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function vocabulary() {
  const [industries, geographies] = await Promise.all([
    prisma.industry.findMany({ include: { sectors: { orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } }),
    prisma.geography.findMany({ orderBy: [{ region: 'asc' }, { name: 'asc' }] }),
  ]);
  return { industries, geographies };
}
