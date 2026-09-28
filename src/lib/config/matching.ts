/**
 * Matching weights live here so they can be tuned without touching the
 * algorithm. They must sum to 1. `scoreMatch` asserts this in development.
 */
export const MATCH_WEIGHTS = {
  sector: 0.3,
  stage: 0.2,
  funding: 0.2,
  geography: 0.15,
  thesis: 0.15,
} as const;

export type MatchDimension = keyof typeof MATCH_WEIGHTS;

/** A pairing is only surfaced as a recommendation above this score. */
export const RECOMMENDATION_THRESHOLD = 45;

/** Indicative conversion rates, used only to compare cheque sizes. */
export const FX_TO_GBP: Record<string, number> = {
  GBP: 1, USD: 0.79, EUR: 0.85, INR: 0.0095, SGD: 0.58,
};

/** Ordered so "adjacent stage" has meaning. */
export const STAGE_ORDER = ['IDEA', 'PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'GROWTH'] as const;
