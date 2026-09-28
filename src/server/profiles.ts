import 'server-only';
import { prisma } from '@/lib/db';
import { notFound, forbidden } from '@/lib/errors';
import { orderPair } from '@/lib/connections/rules';
import type { MatchStartupInput, MatchInvestorInput } from '@/lib/matching/types';

const profileInclude = {
  user: { select: { id: true, role: true, status: true, email: true, emailVerifiedAt: true, isDemo: true } },
  geography: true,
  entrepreneur: true,
  investor: {
    include: {
      organization: true,
      portfolio: { include: { sector: true }, orderBy: { year: 'desc' as const } },
      preference: { include: { sectors: true, industries: true, geographies: true } },
    },
  },
  founderOf: {
    include: {
      startup: { include: { industry: true, sectors: true, geography: true } },
    },
  },
} as const;

export type FullProfile = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;

async function loadProfile(where: { slug: string } | { userId: string }) {
  return prisma.profile.findUnique({ where: where as { slug: string }, include: profileInclude });
}

export async function areConnected(a: string, b: string): Promise<boolean> {
  const [userAId, userBId] = orderPair(a, b);
  const found = await prisma.connection.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } });
  return Boolean(found);
}

export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const found = await prisma.block.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { id: true },
  });
  return Boolean(found);
}

/**
 * Loads a profile and decides what the viewer is allowed to see.
 * Private fields are stripped here, not in the component, so no route can
 * accidentally leak them.
 */
export async function getViewableProfile(slug: string, viewerId: string | null) {
  const profile = await loadProfile({ slug });
  if (!profile) throw notFound('That profile does not exist.');
  if (profile.user.status !== 'ACTIVE' && viewerId !== profile.userId) throw notFound('That profile is not available.');

  const isSelf = viewerId === profile.userId;

  if (viewerId && !isSelf && (await isBlockedEitherWay(viewerId, profile.userId))) {
    throw notFound('That profile is not available.');
  }

  const connected = viewerId && !isSelf ? await areConnected(viewerId, profile.userId) : false;

  if (!isSelf) {
    if (profile.visibility === 'PRIVATE') throw forbidden('This profile is private.');
    if (profile.visibility === 'CONNECTION_ONLY' && !connected) {
      return {
        restricted: true as const,
        profile: {
          slug: profile.slug,
          displayName: profile.displayName,
          headline: profile.headline,
          photoUrl: profile.photoUrl,
          role: profile.user.role,
          isDemo: profile.user.isDemo,
        },
      };
    }
  }

  const email = isSelf || (profile.showEmail && connected) ? profile.user.email : null;

  return { restricted: false as const, profile, isSelf, connected, email };
}

/** Profile completion, used to drive the "what to do next" prompt. */
export function completionFor(profile: FullProfile): { percent: number; missing: string[] } {
  const checks: Array<[string, boolean]> = [
    ['Add a profile photo', Boolean(profile.photoUrl)],
    ['Write a short bio', Boolean(profile.bio && profile.bio.length > 40)],
    ['Set your location', Boolean(profile.geographyId)],
    ['Add a LinkedIn or website link', Boolean(profile.linkedinUrl || profile.websiteUrl)],
  ];

  if (profile.user.role === 'ENTREPRENEUR') {
    const startup = profile.founderOf[0]?.startup;
    checks.push(
      ['Add your startup', Boolean(startup)],
      ['Describe what you do', Boolean(startup?.description && startup.description.length > 80)],
      ['Say how much you are raising', startup?.amountSeeking != null],
      ['Add traction', Boolean(startup?.revenueAnnual || startup?.userCount || startup?.customerCount || startup?.tractionNote)],
      ['Choose what you are looking for', (profile.entrepreneur?.goals.length ?? 0) > 0],
    );
  } else if (profile.user.role === 'INVESTOR') {
    checks.push(
      ['Set your investment preferences', Boolean(profile.investor?.preference)],
      ['Write your investment thesis', Boolean(profile.investor?.thesis && profile.investor.thesis.length > 60)],
      ['List your areas of expertise', (profile.investor?.expertise.length ?? 0) > 0],
      ['Add portfolio companies', (profile.investor?.portfolio.length ?? 0) > 0],
    );
  }

  const done = checks.filter(([, ok]) => ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}

export async function recomputeCompletion(userId: string) {
  const profile = await loadProfile({ userId });
  if (!profile) return 0;
  const { percent } = completionFor(profile);
  await prisma.profile.update({ where: { id: profile.id }, data: { completion: percent } });
  return percent;
}

/* ---------- adapters between database rows and matching inputs ---------- */

export function toMatchStartup(
  startup: {
    sectors: { code: string }[]; industry: { code: string }; stage: string;
    geography: { code: string; region: string } | null;
    amountSeeking: number | null; currency: string; businessModel: string;
    name: string; oneLiner: string; description: string | null;
  },
  goals: string[] = [],
): MatchStartupInput {
  return {
    sectorCodes: startup.sectors.map((s) => s.code),
    industryCode: startup.industry.code,
    stage: startup.stage,
    geographyCode: startup.geography?.code ?? null,
    geographyRegion: startup.geography?.region ?? null,
    amountSeeking: startup.amountSeeking,
    currency: startup.currency,
    businessModel: startup.businessModel,
    keywords: `${startup.name} ${startup.oneLiner} ${startup.description ?? ''}`,
    founderGoals: goals,
  };
}

export function toMatchInvestor(investor: {
  investorType: string; thesis: string | null; expertise: string[];
  organization: { name: string; about: string | null } | null;
  preference: {
    sectors: { code: string }[]; industries: { code: string }[];
    geographies: { code: string; region: string; isAny: boolean }[];
    stages: string[]; minCheque: number; maxCheque: number; currency: string;
  } | null;
}): MatchInvestorInput {
  const p = investor.preference;
  return {
    sectorCodes: p?.sectors.map((s) => s.code) ?? [],
    industryCodes: p?.industries.map((i) => i.code) ?? [],
    stages: p?.stages ?? [],
    geographyCodes: p?.geographies.map((g) => g.code) ?? [],
    geographyRegions: p?.geographies.map((g) => g.region) ?? [],
    investsAnywhere: p?.geographies.some((g) => g.isAny) ?? false,
    minCheque: p?.minCheque ?? 0,
    maxCheque: p?.maxCheque ?? 0,
    currency: p?.currency ?? 'GBP',
    investorType: investor.investorType,
    keywords: `${investor.thesis ?? ''} ${investor.expertise.join(' ')} ${investor.organization?.about ?? ''}`,
  };
}
