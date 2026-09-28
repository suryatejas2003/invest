import { describe, it, expect } from 'vitest';
import { scoreMatch, scoreMatchForInvestor, matchBand } from '@/lib/matching/score';
import { MATCH_WEIGHTS } from '@/lib/config/matching';
import type { MatchStartupInput, MatchInvestorInput } from '@/lib/matching/types';

const startup = (over: Partial<MatchStartupInput> = {}): MatchStartupInput => ({
  sectorCodes: ['PAYMENTS'],
  industryCode: 'FINANCE',
  stage: 'SEED',
  geographyCode: 'UK_LONDON',
  geographyRegion: 'UK & Ireland',
  amountSeeking: 800_000,
  currency: 'GBP',
  businessModel: 'FINTECH_INFRA',
  keywords: 'payments reconciliation infrastructure for marketplaces',
  founderGoals: ['FUNDING'],
  ...over,
});

const investor = (over: Partial<MatchInvestorInput> = {}): MatchInvestorInput => ({
  sectorCodes: ['PAYMENTS'],
  industryCodes: ['FINANCE'],
  stages: ['SEED'],
  geographyCodes: ['UK_LONDON'],
  geographyRegions: ['UK & Ireland'],
  investsAnywhere: false,
  minCheque: 200_000,
  maxCheque: 1_000_000,
  currency: 'GBP',
  investorType: 'MICRO_VC',
  keywords: 'payments infrastructure and reconciliation for regulated firms',
  ...over,
});

describe('match weights', () => {
  it('sum to exactly 1', () => {
    const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('sector compatibility', () => {
  it('scores a direct sector hit above an industry-only hit', () => {
    const direct = scoreMatch(startup(), investor()).breakdown.sector;
    const industryOnly = scoreMatch(startup(), investor({ sectorCodes: ['LENDING'] })).breakdown.sector;
    expect(direct).toBeGreaterThan(industryOnly);
    expect(industryOnly).toBeGreaterThan(0);
  });

  it('scores zero when neither sector nor industry overlap', () => {
    const result = scoreMatch(startup(), investor({ sectorCodes: ['ENERGY'], industryCodes: ['CLIMATE'] }));
    expect(result.breakdown.sector).toBe(0);
  });

  it('names the matched sector in the reasons', () => {
    const result = scoreMatch(startup(), investor(), { sectorNames: { PAYMENTS: 'payments' } });
    expect(result.reasons.some((r) => r.includes('payments'))).toBe(true);
  });

  it('holds up when a startup lists several sectors and only one matches', () => {
    const result = scoreMatch(startup({ sectorCodes: ['PAYMENTS', 'LENDING', 'WEALTH'] }), investor());
    expect(result.breakdown.sector).toBeGreaterThanOrEqual(0.7);
  });
});

describe('stage compatibility', () => {
  it('gives full credit for an exact stage', () => {
    expect(scoreMatch(startup(), investor()).breakdown.stage).toBe(1);
  });

  it('gives partial credit one stage away', () => {
    expect(scoreMatch(startup({ stage: 'PRE_SEED' }), investor()).breakdown.stage).toBe(0.5);
  });

  it('gives less two stages away, and nothing beyond that', () => {
    expect(scoreMatch(startup({ stage: 'SERIES_B' }), investor()).breakdown.stage).toBe(0.2);
    expect(scoreMatch(startup({ stage: 'GROWTH' }), investor()).breakdown.stage).toBe(0);
  });

  it('takes the nearest stage when an investor covers several', () => {
    const result = scoreMatch(startup({ stage: 'SERIES_A' }), investor({ stages: ['IDEA', 'SEED'] }));
    expect(result.breakdown.stage).toBe(0.5);
  });
});

describe('geography compatibility', () => {
  it('gives full credit for an exact location', () => {
    expect(scoreMatch(startup(), investor()).breakdown.geography).toBe(1);
  });

  it('gives partial credit within the same region', () => {
    const result = scoreMatch(startup({ geographyCode: 'IE_DUBLIN' }), investor());
    expect(result.breakdown.geography).toBe(0.6);
  });

  it('treats an investor with no geographic restriction generously but not perfectly', () => {
    const result = scoreMatch(startup({ geographyCode: 'SG_SINGAPORE', geographyRegion: 'Asia Pacific' }), investor({ investsAnywhere: true }));
    expect(result.breakdown.geography).toBe(0.85);
    expect(result.reasons.some((r) => r.includes('without a geographic restriction'))).toBe(true);
  });

  it('scores zero when the region does not overlap at all', () => {
    const result = scoreMatch(startup({ geographyCode: 'SG_SINGAPORE', geographyRegion: 'Asia Pacific' }), investor());
    expect(result.breakdown.geography).toBe(0);
  });
});

describe('funding compatibility', () => {
  it('gives full credit when the round sits inside the cheque range', () => {
    expect(scoreMatch(startup(), investor()).breakdown.funding).toBe(1);
  });

  it('still credits a round larger than one cheque, as co-investment', () => {
    const result = scoreMatch(startup({ amountSeeking: 2_000_000 }), investor());
    expect(result.breakdown.funding).toBe(0.65);
    expect(result.reasons.some((r) => r.includes('part of a round'))).toBe(true);
  });

  it('drops off when the round dwarfs the maximum cheque', () => {
    expect(scoreMatch(startup({ amountSeeking: 50_000_000 }), investor()).breakdown.funding).toBe(0);
  });

  it('converts currencies before comparing', () => {
    const usdInvestor = investor({ currency: 'USD', minCheque: 250_000, maxCheque: 1_250_000 });
    const result = scoreMatch(startup({ amountSeeking: 800_000, currency: 'GBP' }), usdInvestor);
    expect(result.breakdown.funding).toBe(1);
  });

  it('is neutral when the founder has not said what they are raising', () => {
    expect(scoreMatch(startup({ amountSeeking: null }), investor()).breakdown.funding).toBe(0.5);
  });
});

describe('overall score', () => {
  it('rates a complete match far above a complete mismatch', () => {
    const good = scoreMatch(startup(), investor()).score;
    const bad = scoreMatch(
      startup(),
      investor({
        sectorCodes: ['BIOTECH'], industryCodes: ['HEALTH'], stages: ['GROWTH'],
        geographyCodes: ['IN_MUMBAI'], geographyRegions: ['Asia Pacific'],
        minCheque: 5_000_000, maxCheque: 20_000_000, keywords: 'clinical trials and drug discovery',
      }),
    ).score;
    expect(good).toBeGreaterThan(85);
    expect(bad).toBeLessThan(20);
  });

  it('never leaves a pairing without an explanation', () => {
    const result = scoreMatch(startup(), investor({ sectorCodes: [], industryCodes: [], stages: [], geographyCodes: [], geographyRegions: [], keywords: '' }));
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('caps the number of reasons it shows', () => {
    expect(scoreMatch(startup(), investor()).reasons.length).toBeLessThanOrEqual(4);
  });

  it('bands scores for display', () => {
    expect(matchBand(90)).toBe('strong');
    expect(matchBand(60)).toBe('relevant');
    expect(matchBand(30)).toBe('possible');
  });
});

describe('investor point of view', () => {
  it('produces the same score but differently worded reasons', () => {
    const s = startup();
    const i = investor();
    const founderSide = scoreMatch(s, i);
    const investorSide = scoreMatchForInvestor(s, i);
    expect(investorSide.score).toBe(founderSide.score);
    expect(investorSide.reasons).not.toEqual(founderSide.reasons);
  });

  it('surfaces a founder asking for mentorship', () => {
    const result = scoreMatchForInvestor(startup({ founderGoals: ['FUNDING', 'MENTORSHIP'] }), investor());
    expect(result.reasons.some((r) => r.includes('mentorship'))).toBe(true);
  });
});
