'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FounderGoal, StartupStage } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser, revokeOtherSessions } from '@/lib/auth/session';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { toPublicError, badRequest, unauthorized } from '@/lib/errors';
import { uploadImage } from '@/lib/services/storage';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { recomputeCompletion } from '@/server/profiles';
import { advanceStep, completeOnboarding, setRole, uniqueStartupSlug } from '@/server/onboarding';
import { track } from '@/lib/services/analytics';
import { audit } from '@/lib/services/audit';
import { refreshRecommendations } from '@/server/discovery';
import {
  profileBasicsSchema, startupSchema, fundingSchema, tractionSchema, goalsSchema,
  investorSchema, preferenceSchema, privacySchema, notificationPrefsSchema, changePasswordSchema,
} from '@/lib/validation/schemas';
import { slugify } from '@/lib/utils/format';

export interface ActionState { error?: string; fieldErrors?: Record<string, string>; success?: string }

const fieldErrors = (issues: { path: (string | number)[]; message: string }[]) => {
  const out: Record<string, string> = {};
  for (const i of issues) { const k = String(i.path[0] ?? '_'); if (!out[k]) out[k] = i.message; }
  return out;
};
const fail = (err: unknown): ActionState => ({ error: toPublicError(err).message });
const many = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(Boolean);

async function myProfile() {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id }, include: { founderOf: true, investor: true } });
  if (!profile) throw badRequest('Your profile is missing. Sign out and back in.');
  return { user, profile };
}

/** Optional photo upload shared by the basics form. */
async function maybeUpload(formData: FormData, field: string, folder: 'avatars' | 'logos') {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) return (await uploadImage(file, folder)).url;
  return undefined;
}

export async function chooseRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const role = String(formData.get('role'));
    if (role !== 'ENTREPRENEUR' && role !== 'INVESTOR') return { error: 'Choose one of the two options.' };
    await setRole(user.id, role);
    await advanceStep(user.id, 1);
    revalidatePath('/onboarding');
    return { success: '' };
  } catch (err) { return fail(err); }
}

export async function saveBasicsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const { user, profile } = await myProfile();
    const parsed = profileBasicsSchema.safeParse({
      displayName: formData.get('displayName'),
      headline: formData.get('headline') || undefined,
      bio: formData.get('bio') || undefined,
      geographyId: formData.get('geographyId') || '',
      linkedinUrl: formData.get('linkedinUrl') || '',
      websiteUrl: formData.get('websiteUrl') || '',
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

    const photoUrl = await maybeUpload(formData, 'photo', 'avatars');
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        displayName: parsed.data.displayName,
        headline: parsed.data.headline || null,
        bio: parsed.data.bio || null,
        geographyId: parsed.data.geographyId || null,
        linkedinUrl: parsed.data.linkedinUrl || null,
        websiteUrl: parsed.data.websiteUrl || null,
        ...(photoUrl ? { photoUrl } : {}),
      },
    });
    await recomputeCompletion(user.id);
    revalidatePath('/settings');
    revalidatePath(`/p/${profile.slug}`);
    return { success: 'Saved.' };
  } catch (err) { return fail(err); }
}

export async function saveStartupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const { user, profile } = await myProfile();
    const parsed = startupSchema.safeParse({
      name: formData.get('name'),
      oneLiner: formData.get('oneLiner'),
      description: formData.get('description') || undefined,
      industryId: formData.get('industryId'),
      sectorIds: many(formData, 'sectorIds'),
      geographyId: formData.get('geographyId'),
      stage: formData.get('stage'),
      businessModel: formData.get('businessModel'),
      foundedYear: formData.get('foundedYear') || undefined,
      teamSize: formData.get('teamSize') || undefined,
      websiteUrl: formData.get('websiteUrl') || '',
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

    const logoUrl = await maybeUpload(formData, 'logo', 'logos');
    const existing = profile.founderOf[0];

    const data = {
      name: parsed.data.name,
      oneLiner: parsed.data.oneLiner,
      description: parsed.data.description || null,
      industryId: parsed.data.industryId,
      geographyId: parsed.data.geographyId,
      stage: parsed.data.stage,
      businessModel: parsed.data.businessModel,
      foundedYear: parsed.data.foundedYear ?? null,
      teamSize: parsed.data.teamSize ?? null,
      websiteUrl: parsed.data.websiteUrl || null,
      sectors: { set: parsed.data.sectorIds.map((id) => ({ id })) },
      ...(logoUrl ? { logoUrl } : {}),
    };

    if (existing) {
      await prisma.startup.update({ where: { id: existing.startupId }, data });
    } else {
      const startup = await prisma.startup.create({
        data: { ...data, slug: await uniqueStartupSlug(parsed.data.name), sectors: { connect: parsed.data.sectorIds.map((id) => ({ id })) } },
      });
      await prisma.founder.create({ data: { profileId: profile.id, startupId: startup.id, isPrimary: true } });
      await track('startup_created', user.id, { stage: parsed.data.stage });
    }

    await recomputeCompletion(user.id);
    revalidatePath('/settings');
    return { success: 'Saved.' };
  } catch (err) { return fail(err); }
}

export async function saveFundingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const { user, profile } = await myProfile();
    const startupId = profile.founderOf[0]?.startupId;
    if (!startupId) return { error: 'Add your startup first.' };

    const parsed = fundingSchema.safeParse({
      amountRaised: formData.get('amountRaised') || undefined,
      amountSeeking: formData.get('amountSeeking') || undefined,
      currency: formData.get('currency'),
      previousFunding: formData.get('previousFunding') || undefined,
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

    await prisma.startup.update({
      where: { id: startupId },
      data: {
        amountRaised: parsed.data.amountRaised ?? null,
        amountSeeking: parsed.data.amountSeeking ?? null,
        currency: parsed.data.currency,
        previousFunding: parsed.data.previousFunding || null,
      },
    });
    await recomputeCompletion(user.id);
    return { success: 'Saved.' };
  } catch (err) { return fail(err); }
}

export async function saveTractionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const { user, profile } = await myProfile();
    const startupId = profile.founderOf[0]?.startupId;
    if (!startupId) return { error: 'Add your startup first.' };

    const parsed = tractionSchema.safeParse({
      revenueAnnual: formData.get('revenueAnnual') || undefined,
      userCount: formData.get('userCount') || undefined,
      customerCount: formData.get('customerCount') || undefined,
      growthNote: formData.get('growthNote') || undefined,
      tractionNote: formData.get('tractionNote') || undefined,
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

    await prisma.startup.update({
      where: { id: startupId },
      data: {
        revenueAnnual: parsed.data.revenueAnnual ?? null,
        userCount: parsed.data.userCount ?? null,
        customerCount: parsed.data.customerCount ?? null,
        growthNote: parsed.data.growthNote || null,
        tractionNote: parsed.data.tractionNote || null,
      },
    });
    await recomputeCompletion(user.id);
    return { success: 'Saved.' };
  } catch (err) { return fail(err); }
}

export async function saveGoalsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const { user, profile } = await myProfile();
    const parsed = goalsSchema.safeParse({ goals: many(formData, 'goals') });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

    await prisma.entrepreneurProfile.upsert({
      where: { profileId: profile.id },
      create: { profileId: profile.id, goals: parsed.data.goals as FounderGoal[] },
      update: { goals: parsed.data.goals as FounderGoal[] },
    });
    await recomputeCompletion(user.id);
    return { success: 'Saved.' };
  } catch (err) { return fail(err); }
}

export async function saveInvestorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const { user, profile } = await myProfile();
    const parsed = investorSchema.safeParse({
      investorType: formData.get('investorType'),
      organizationName: formData.get('organizationName') || undefined,
      thesis: formData.get('thesis') || undefined,
      expertise: many(formData, 'expertise').flatMap((e) => e.split(',')).map((e) => e.trim()).filter(Boolean).slice(0, 10),
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

    let organizationId: string | null = null;
    if (parsed.data.organizationName) {
      const slug = slugify(parsed.data.organizationName);
      const org = await prisma.organization.upsert({
        where: { slug },
        create: { name: parsed.data.organizationName, slug },
        update: {},
      });
      organizationId = org.id;
    }

    await prisma.investorProfile.upsert({
      where: { profileId: profile.id },
      create: { profileId: profile.id, investorType: parsed.data.investorType, thesis: parsed.data.thesis || null, expertise: parsed.data.expertise, organizationId },
      update: { investorType: parsed.data.investorType, thesis: parsed.data.thesis || null, expertise: parsed.data.expertise, organizationId },
    });
    await recomputeCompletion(user.id);
    return { success: 'Saved.' };
  } catch (err) { return fail(err); }
}

export async function savePreferenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const { user, profile } = await myProfile();
    const parsed = preferenceSchema.safeParse({
      sectorIds: many(formData, 'sectorIds'),
      industryIds: many(formData, 'industryIds'),
      geographyIds: many(formData, 'geographyIds'),
      stages: many(formData, 'stages'),
      minCheque: formData.get('minCheque'),
      maxCheque: formData.get('maxCheque'),
      currency: formData.get('currency'),
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

    const investor = await prisma.investorProfile.upsert({
      where: { profileId: profile.id },
      create: { profileId: profile.id, investorType: 'ANGEL', expertise: [] },
      update: {},
    });

    const relations = {
      sectors: { set: parsed.data.sectorIds.map((id) => ({ id })) },
      industries: { set: parsed.data.industryIds.map((id) => ({ id })) },
      geographies: { set: parsed.data.geographyIds.map((id) => ({ id })) },
    };

    await prisma.fundingPreference.upsert({
      where: { investorProfileId: investor.id },
      create: {
        investorProfileId: investor.id,
        stages: parsed.data.stages as StartupStage[],
        minCheque: parsed.data.minCheque,
        maxCheque: parsed.data.maxCheque,
        currency: parsed.data.currency,
        sectors: { connect: parsed.data.sectorIds.map((id) => ({ id })) },
        industries: { connect: parsed.data.industryIds.map((id) => ({ id })) },
        geographies: { connect: parsed.data.geographyIds.map((id) => ({ id })) },
      },
      update: {
        stages: parsed.data.stages as StartupStage[],
        minCheque: parsed.data.minCheque,
        maxCheque: parsed.data.maxCheque,
        currency: parsed.data.currency,
        ...relations,
      },
    });

    await recomputeCompletion(user.id);
    return { success: 'Saved.' };
  } catch (err) { return fail(err); }
}

export async function finishOnboardingAction(): Promise<void> {
  const user = await requireUser();
  await completeOnboarding(user.id);
  await refreshRecommendations(user.id).catch(() => []);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function savePrivacyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const { profile } = await myProfile();
    const parsed = privacySchema.safeParse({
      visibility: formData.get('visibility'),
      showEmail: formData.get('showEmail') === 'on',
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
    await prisma.profile.update({ where: { id: profile.id }, data: parsed.data });
    revalidatePath('/settings');
    return { success: 'Privacy settings saved.' };
  } catch (err) { return fail(err); }
}

export async function saveNotificationPrefsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const parsed = notificationPrefsSchema.safeParse({
      notifyByEmail: formData.get('notifyByEmail') === 'on',
      notifyOnMessage: formData.get('notifyOnMessage') === 'on',
      notifyOnRequest: formData.get('notifyOnRequest') === 'on',
      notifyOnMatch: formData.get('notifyOnMatch') === 'on',
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
    await prisma.user.update({ where: { id: user.id }, data: parsed.data });
    revalidatePath('/settings');
    return { success: 'Notification settings saved.' };
  } catch (err) { return fail(err); }
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!(await verifyPassword(parsed.data.currentPassword, record?.passwordHash ?? null))) {
      throw unauthorized('That is not your current password.');
    }

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
    await revokeOtherSessions(user.id);
    await audit({ actorId: user.id, action: 'user.password_change', entityType: 'User', entityId: user.id });
    return { success: 'Password changed. Other devices have been signed out.' };
  } catch (err) { return fail(err); }
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    if (String(formData.get('confirm')).trim().toLowerCase() !== 'delete') {
      return { error: 'Type "delete" to confirm.' };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'DELETED', email: `deleted+${user.id}@doorkey.invalid`, passwordHash: null, googleId: null },
    });
    await prisma.profile.updateMany({ where: { userId: user.id }, data: { visibility: 'PRIVATE', displayName: 'Deleted member', bio: null, photoUrl: null } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await audit({ actorId: user.id, action: 'user.delete', entityType: 'User', entityId: user.id });
  } catch (err) { return fail(err); }
  redirect('/');
}
