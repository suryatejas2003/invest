import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { scoreMatch, scoreMatchForInvestor, matchBand } from '@/lib/matching/score';
import { toMatchInvestor, toMatchStartup } from './profiles';
import type { DiscoverQuery } from '@/lib/validation/schemas';
import { track } from '@/lib/services/analytics';
import { RECOMMENDATION_THRESHOLD } from '@/lib/config/matching';

export const PAGE_SIZE = 12;
/** Relevance sorting scores in memory, so the candidate set is capped. */
const CANDIDATE_CAP = 300;

const investorInclude = {
  profile: {
    include: {
      geography: true,
      user: { select: { id: true, role: true, isDemo: true } },
    },
  },
  organization: true,
  preference: { include: { sectors: true, industries: true, geographies: true } },
  portfolio: { take: 3, orderBy: { year: 'desc' as const } },
} satisfies Prisma.InvestorProfileInclude;

const startupInclude = {
  industry: true,
  sectors: true,
  geography: true,
  founders: {
    include: {
      profile: { include: { user: { select: { id: true, isDemo: true, status: true } }, geography: true, entrepreneur: true } },
    },
  },
} satisfies Prisma.StartupInclude;

/** Ids the viewer must never see: themselves and anyone blocked either way. */
async function excludedUserIds(viewerId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>([viewerId]);
  for (const b of blocks) { ids.add(b.blockerId); ids.add(b.blockedId); }
  return [...ids];
}

export interface DiscoverResultItem {
  id: string;
  userId: string;
  slug: string;
  name: string;
  subtitle: string;
  photoUrl: string | null;
  location: string | null;
  isDemo: boolean;
  tags: string[];
  facts: Array<{ label: string; value: string }>;
  score: number;
  band: 'strong' | 'relevant' | 'possible';
  reasons: string[];
}

export async function discoverInvestors(viewerUserId: string, query: DiscoverQuery) {
  const excluded = await excludedUserIds(viewerUserId);

  const viewer = await prisma.profile.findUnique({
    where: { userId: viewerUserId },
    include: {
      entrepreneur: true,
      founderOf: { include: { startup: { include: { industry: true, sectors: true, geography: true } } } },
    },
  });
  const viewerStartup = viewer?.founderOf[0]?.startup ?? null;

  const where: Prisma.InvestorProfileWhereInput = {
    profile: {
      visibility: { in: ['PUBLIC', 'CONNECTION_ONLY'] },
      user: { status: 'ACTIVE', id: { notIn: excluded } },
      ...(query.geography?.length ? { geography: { code: { in: query.geography } } } : {}),
    },
    ...(query.investorType?.length ? { investorType: { in: query.investorType } } : {}),
    ...(query.sector?.length || query.stage?.length || query.minCheque != null || query.maxCheque != null
      ? {
          preference: {
            ...(query.sector?.length ? { sectors: { some: { code: { in: query.sector } } } } : {}),
            ...(query.stage?.length ? { stages: { hasSome: query.stage } } : {}),
            ...(query.minCheque != null ? { maxCheque: { gte: query.minCheque } } : {}),
            ...(query.maxCheque != null ? { minCheque: { lte: query.maxCheque } } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { profile: { displayName: { contains: query.q, mode: 'insensitive' } } },
            { profile: { headline: { contains: query.q, mode: 'insensitive' } } },
            { thesis: { contains: query.q, mode: 'insensitive' } },
            { organization: { name: { contains: query.q, mode: 'insensitive' } } },
            { expertise: { has: query.q } },
          ],
        }
      : {}),
  };

  const total = await prisma.investorProfile.count({ where });
  const candidates = await prisma.investorProfile.findMany({
    where,
    include: investorInclude,
    take: query.sort === 'relevance' ? CANDIDATE_CAP : PAGE_SIZE,
    skip: query.sort === 'relevance' ? 0 : (query.page - 1) * PAGE_SIZE,
    orderBy:
      query.sort === 'name' ? { profile: { displayName: 'asc' } }
      : query.sort === 'recent' ? { createdAt: 'desc' }
      : { createdAt: 'desc' },
  });

  const sectorNames: Record<string, string> = {};
  for (const c of candidates) for (const s of c.preference?.sectors ?? []) sectorNames[s.code] = s.name;

  const startupInput = viewerStartup
    ? toMatchStartup(viewerStartup, viewer?.entrepreneur?.goals ?? [])
    : null;

  let items: DiscoverResultItem[] = candidates.map((inv) => {
    const match = startupInput
      ? scoreMatch(startupInput, toMatchInvestor(inv), {
          sectorNames,
          geographyName: viewerStartup?.geography?.name,
          stageName: viewerStartup?.stage.toLowerCase().replace(/_/g, '-'),
        })
      : { score: 0, reasons: ['Complete your startup profile to see why this may be relevant'], breakdown: {} };

    return {
      id: inv.id,
      userId: inv.profile.user.id,
      slug: inv.profile.slug,
      name: inv.profile.displayName,
      subtitle: inv.organization?.name ?? inv.investorType.replace(/_/g, ' ').toLowerCase(),
      photoUrl: inv.profile.photoUrl,
      location: inv.profile.geography?.name ?? null,
      isDemo: inv.profile.user.isDemo,
      tags: (inv.preference?.sectors ?? []).slice(0, 3).map((s) => s.name),
      facts: [
        { label: 'Stages', value: (inv.preference?.stages ?? []).map((s) => s.replace(/_/g, ' ').toLowerCase()).join(', ') || '—' },
        { label: 'Cheque', value: inv.preference ? `${inv.preference.minCheque}-${inv.preference.maxCheque}|${inv.preference.currency}` : '—' },
      ],
      score: match.score,
      band: matchBand(match.score),
      reasons: match.reasons,
    };
  });

  if (query.sort === 'relevance') {
    items.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    items = items.slice((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE);
  }

  await track('search_performed', viewerUserId, { resultCount: total, filtersUsed: countFilters(query) });
  return { items, total, page: query.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function discoverStartups(viewerUserId: string, query: DiscoverQuery) {
  const excluded = await excludedUserIds(viewerUserId);

  const viewer = await prisma.investorProfile.findFirst({
    where: { profile: { userId: viewerUserId } },
    include: { organization: true, preference: { include: { sectors: true, industries: true, geographies: true } } },
  });

  const where: Prisma.StartupWhereInput = {
    visibility: { in: ['PUBLIC', 'CONNECTION_ONLY'] },
    founders: { some: { profile: { user: { status: 'ACTIVE', id: { notIn: excluded } } } } },
    ...(query.stage?.length ? { stage: { in: query.stage } } : {}),
    ...(query.sector?.length ? { sectors: { some: { code: { in: query.sector } } } } : {}),
    ...(query.industry ? { industry: { code: query.industry } } : {}),
    ...(query.geography?.length ? { geography: { code: { in: query.geography } } } : {}),
    ...(query.businessModel?.length ? { businessModel: { in: query.businessModel } } : {}),
    ...(query.minSeeking != null ? { amountSeeking: { gte: query.minSeeking } } : {}),
    ...(query.maxSeeking != null ? { amountSeeking: { lte: query.maxSeeking } } : {}),
    ...(query.hasTraction
      ? { OR: [{ revenueAnnual: { gt: 0 } }, { userCount: { gt: 0 } }, { customerCount: { gt: 0 } }] }
      : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { oneLiner: { contains: query.q, mode: 'insensitive' } },
            { description: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const total = await prisma.startup.count({ where });
  const candidates = await prisma.startup.findMany({
    where,
    include: startupInclude,
    take: query.sort === 'relevance' ? CANDIDATE_CAP : PAGE_SIZE,
    skip: query.sort === 'relevance' ? 0 : (query.page - 1) * PAGE_SIZE,
    orderBy: query.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
  });

  const sectorNames: Record<string, string> = {};
  for (const s of candidates) for (const sec of s.sectors) sectorNames[sec.code] = sec.name;

  const investorInput = viewer ? toMatchInvestor(viewer) : null;

  let items: DiscoverResultItem[] = candidates
    .filter((s) => s.founders.length > 0)
    .map((s) => {
      const founder = s.founders.find((f) => f.isPrimary) ?? s.founders[0];
      const match = investorInput
        ? scoreMatchForInvestor(toMatchStartup(s, founder.profile.entrepreneur?.goals ?? []), investorInput, {
            sectorNames,
            geographyName: s.geography?.name,
          })
        : { score: 0, reasons: ['Set your investment preferences to see why this may be relevant'], breakdown: {} };

      return {
        id: s.id,
        userId: founder.profile.userId,
        slug: founder.profile.slug,
        name: s.name,
        subtitle: `${founder.profile.displayName} · ${founder.title}`,
        photoUrl: s.logoUrl ?? founder.profile.photoUrl,
        location: s.geography?.name ?? null,
        isDemo: founder.profile.user.isDemo,
        tags: s.sectors.slice(0, 3).map((x) => x.name),
        facts: [
          { label: 'Stage', value: s.stage.replace(/_/g, ' ').toLowerCase() },
          { label: 'Raising', value: s.amountSeeking != null ? `${s.amountSeeking}|${s.currency}` : '—' },
        ],
        score: match.score,
        band: matchBand(match.score),
        reasons: match.reasons,
      };
    });

  if (query.sort === 'relevance') {
    items.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    items = items.slice((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE);
  }

  await track('search_performed', viewerUserId, { resultCount: total, filtersUsed: countFilters(query) });
  return { items, total, page: query.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

function countFilters(q: DiscoverQuery) {
  return [q.q, q.sector?.length, q.stage?.length, q.geography?.length, q.investorType?.length, q.businessModel?.length, q.minCheque, q.maxCheque, q.minSeeking, q.maxSeeking, q.hasTraction]
    .filter(Boolean).length;
}

/**
 * Recommendations are the same scoring pass, run over everyone and cached in
 * the Recommendation table so the dashboard is a single indexed read.
 */
export async function refreshRecommendations(userId: string, limit = 12) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return [];

  const base = { q: undefined, sort: 'relevance' as const, page: 1 };
  const found = user.role === 'ENTREPRENEUR'
    ? await discoverInvestors(userId, { ...base, page: 1 } as DiscoverQuery)
    : await discoverStartups(userId, { ...base, page: 1 } as DiscoverQuery);

  const keep = found.items.filter((i) => i.score >= RECOMMENDATION_THRESHOLD).slice(0, limit);

  await prisma.$transaction(
    keep.map((i) =>
      prisma.recommendation.upsert({
        where: { ownerId_subjectId: { ownerId: userId, subjectId: i.userId } },
        create: { ownerId: userId, subjectId: i.userId, score: i.score, reasons: i.reasons },
        update: { score: i.score, reasons: i.reasons, computedAt: new Date() },
      }),
    ),
  );

  return keep;
}
