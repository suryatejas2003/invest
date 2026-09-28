export interface MatchStartupInput {
  sectorCodes: string[];
  industryCode: string;
  stage: string;
  geographyCode: string | null;
  geographyRegion: string | null;
  amountSeeking: number | null;
  currency: string;
  businessModel: string;
  keywords: string;
  founderGoals: string[];
}

export interface MatchInvestorInput {
  sectorCodes: string[];
  industryCodes: string[];
  stages: string[];
  geographyCodes: string[];
  geographyRegions: string[];
  investsAnywhere: boolean;
  minCheque: number;
  maxCheque: number;
  currency: string;
  investorType: string;
  keywords: string;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  breakdown: Record<string, number>;
}
