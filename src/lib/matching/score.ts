import { MATCH_WEIGHTS, FX_TO_GBP, STAGE_ORDER } from '@/lib/config/matching';
import type { MatchStartupInput, MatchInvestorInput, MatchResult } from './types';

const toGbp = (amount: number, currency: string) => amount * (FX_TO_GBP[currency] ?? 1);

/** Words that carry no signal when comparing a thesis to a pitch. */
const STOPWORDS = new Set([
  'the','and','for','with','that','this','from','are','our','their','we','you','a','an','of','to','in','on','at','by',
  'is','it','as','be','or','we,','company','companies','startup','startups','founders','founder','building','build',
  'early','stage','looking','across','into','who','have','has','will','they','them','make','making','using','use',
]);

function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function sectorScore(s: MatchStartupInput, i: MatchInvestorInput) {
  if (s.sectorCodes.length === 0 || i.sectorCodes.length === 0) {
    return { value: i.industryCodes.includes(s.industryCode) ? 0.6 : 0, overlap: [] as string[] };
  }
  const investorSectors = new Set(i.sectorCodes);
  const overlap = s.sectorCodes.filter((c) => investorSectors.has(c));
  if (overlap.length > 0) {
    // Proportion of the startup's sectors the investor actively covers,
    // floored at 0.7 so a single strong hit still reads as a real match.
    const proportion = overlap.length / s.sectorCodes.length;
    return { value: Math.max(0.7, proportion), overlap };
  }
  // No sector hit, but the broader industry matches.
  return { value: i.industryCodes.includes(s.industryCode) ? 0.4 : 0, overlap: [] };
}

function stageScore(s: MatchStartupInput, i: MatchInvestorInput) {
  if (i.stages.length === 0) return 0.5;
  if (i.stages.includes(s.stage)) return 1;
  const idx = STAGE_ORDER.indexOf(s.stage as (typeof STAGE_ORDER)[number]);
  if (idx < 0) return 0;
  const distance = Math.min(
    ...i.stages.map((st) => {
      const j = STAGE_ORDER.indexOf(st as (typeof STAGE_ORDER)[number]);
      return j < 0 ? 99 : Math.abs(j - idx);
    }),
  );
  if (distance === 1) return 0.5;
  if (distance === 2) return 0.2;
  return 0;
}

function geographyScore(s: MatchStartupInput, i: MatchInvestorInput) {
  if (i.investsAnywhere) return 0.85;
  if (!s.geographyCode) return 0.4;
  if (i.geographyCodes.includes(s.geographyCode)) return 1;
  if (s.geographyRegion && i.geographyRegions.includes(s.geographyRegion)) return 0.6;
  return 0;
}

function fundingScore(s: MatchStartupInput, i: MatchInvestorInput) {
  if (s.amountSeeking == null) return 0.5;
  const seeking = toGbp(s.amountSeeking, s.currency);
  const min = toGbp(i.minCheque, i.currency);
  const max = toGbp(i.maxCheque, i.currency);
  if (seeking >= min && seeking <= max) return 1;
  // A round larger than one cheque is normal — investors take part of a round.
  if (seeking > max) {
    const ratio = max / seeking;
    if (ratio >= 0.25) return 0.65;
    if (ratio >= 0.1) return 0.3;
    return 0;
  }
  const ratio = seeking / min;
  if (ratio >= 0.5) return 0.5;
  return 0.15;
}

function thesisScore(s: MatchStartupInput, i: MatchInvestorInput) {
  const a = tokenise(`${s.keywords} ${s.businessModel.replace(/_/g, ' ')}`);
  const b = tokenise(i.keywords);
  if (a.size === 0 || b.size === 0) return { value: 0.35, shared: [] as string[] };
  const shared = [...a].filter((w) => b.has(w));
  const value = Math.min(1, shared.length / 4);
  return { value: Math.max(0.2, value), shared: shared.slice(0, 3) };
}

const pct = (n: number) => Math.round(n * 100);

/**
 * Transparent weighted match between a startup and an investor.
 * Returns a 0–100 score plus plain-language reasons. The score exists to
 * order results; the reasons are what the interface actually shows.
 */
export function scoreMatch(
  startup: MatchStartupInput,
  investor: MatchInvestorInput,
  labels: {
    sectorNames?: Record<string, string>;
    geographyName?: string;
    stageName?: string;
  } = {},
): MatchResult {
  const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`Match weights must sum to 1, got ${sum}`);
  }

  const sector = sectorScore(startup, investor);
  const stage = stageScore(startup, investor);
  const geography = geographyScore(startup, investor);
  const funding = fundingScore(startup, investor);
  const thesis = thesisScore(startup, investor);

  const breakdown = {
    sector: sector.value,
    stage,
    geography,
    funding,
    thesis: thesis.value,
  };

  const score = Math.round(
    100 *
      (sector.value * MATCH_WEIGHTS.sector +
        stage * MATCH_WEIGHTS.stage +
        geography * MATCH_WEIGHTS.geography +
        funding * MATCH_WEIGHTS.funding +
        thesis.value * MATCH_WEIGHTS.thesis),
  );

  const reasons: string[] = [];

  if (sector.overlap.length > 0) {
    const names = sector.overlap.map((c) => labels.sectorNames?.[c] ?? c.toLowerCase().replace(/_/g, ' '));
    reasons.push(
      names.length === 1
        ? `Invests in ${names[0]}`
        : `Invests in ${names.slice(0, 2).join(' and ')}`,
    );
  } else if (sector.value > 0) {
    reasons.push('Active in your wider industry');
  }

  if (stage === 1) {
    reasons.push(`Backs companies at ${labels.stageName ?? startup.stage.toLowerCase().replace(/_/g, '-')}`);
  } else if (stage >= 0.5) {
    reasons.push('Invests one stage either side of where you are');
  }

  if (funding === 1) {
    reasons.push('Your round fits their usual cheque size');
  } else if (funding >= 0.6) {
    reasons.push('Could take part of a round this size');
  }

  if (geography === 1 && labels.geographyName) {
    reasons.push(`Invests in ${labels.geographyName}`);
  } else if (geography >= 0.85) {
    reasons.push('Invests without a geographic restriction');
  } else if (geography >= 0.6) {
    reasons.push('Active in your region');
  }

  if (thesis.shared.length >= 2) {
    reasons.push(`Their thesis mentions ${thesis.shared.slice(0, 2).join(' and ')}`);
  }

  if (reasons.length === 0) reasons.push('Limited overlap with what you are looking for');

  return { score, reasons: reasons.slice(0, 4), breakdown };
}

/** Same pairing, described from the investor's side of the table. */
export function scoreMatchForInvestor(
  startup: MatchStartupInput,
  investor: MatchInvestorInput,
  labels: Parameters<typeof scoreMatch>[2] = {},
): MatchResult {
  const base = scoreMatch(startup, investor, labels);
  const reasons: string[] = [];

  if (base.breakdown.sector >= 0.7) {
    const names = startup.sectorCodes
      .filter((c) => investor.sectorCodes.includes(c))
      .map((c) => labels.sectorNames?.[c] ?? c.toLowerCase().replace(/_/g, ' '));
    if (names.length) reasons.push(`Operates in ${names.slice(0, 2).join(' and ')}, which you cover`);
  }
  if (base.breakdown.stage === 1) reasons.push('At a stage you invest in');
  if (base.breakdown.funding === 1) reasons.push('Raising within your cheque range');
  else if (base.breakdown.funding >= 0.6) reasons.push('Round is larger than your cheque — co-investment shape');
  if (base.breakdown.geography >= 1 && labels.geographyName) reasons.push(`Based in ${labels.geographyName}`);
  if (startup.founderGoals.includes('MENTORSHIP')) reasons.push('Founder is asking for mentorship, not only capital');

  return {
    score: base.score,
    reasons: reasons.length ? reasons.slice(0, 4) : base.reasons,
    breakdown: base.breakdown,
  };
}

/** Human-readable confidence band. The raw number is never shown in the UI. */
export function matchBand(score: number): 'strong' | 'relevant' | 'possible' {
  if (score >= 75) return 'strong';
  if (score >= 55) return 'relevant';
  return 'possible';
}

export { pct };
