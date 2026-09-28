import { prisma } from '@/lib/db';

/**
 * Internal, privacy-conscious event log: event name, optional user id, and
 * non-identifying properties only. No message bodies, no free text a user
 * typed, no IP addresses.
 */
export const EVENTS = [
  'signup', 'onboarding_completed', 'profile_completed', 'startup_created',
  'investor_discovered', 'startup_discovered', 'profile_viewed',
  'connection_request_sent', 'connection_accepted', 'message_sent',
  'introduction_requested', 'introduction_accepted', 'ai_feature_used',
  'search_performed', 'profile_saved',
] as const;

export type EventName = (typeof EVENTS)[number];

type Props = Record<string, string | number | boolean | null>;

const SAFE_KEYS = new Set([
  'role', 'stage', 'sector', 'industry', 'feature', 'source', 'resultCount',
  'filtersUsed', 'band', 'step', 'kind', 'method',
]);

export async function track(name: EventName, userId: string | null, props: Props = {}) {
  const safe: Props = {};
  for (const [k, v] of Object.entries(props)) if (SAFE_KEYS.has(k)) safe[k] = v;
  try {
    await prisma.analyticsEvent.create({ data: { name, userId, props: safe } });
  } catch (err) {
    console.error('[analytics] failed to record', name, err);
  }
}
