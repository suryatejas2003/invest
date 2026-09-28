import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { enforce } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import { ai, aiConfigured } from '@/lib/services/ai';
import { toPublicError, forbidden, notFound } from '@/lib/errors';
import { track } from '@/lib/services/analytics';
import { areConnected } from '@/server/profiles';
import { aiProfileSchema, aiIntroSchema } from '@/lib/validation/schemas';
import { STAGE_LABEL, INVESTOR_TYPE_LABEL } from '@/lib/config/vocab';
import { money } from '@/lib/utils/format';

const bodySchema = z.discriminatedUnion('feature', [
  z.object({ feature: z.literal('profile'), ...aiProfileSchema.shape }),
  z.object({ feature: z.literal('introduction'), ...aiIntroSchema.shape }),
  z.object({ feature: z.literal('summary'), subjectUserId: z.string().uuid() }),
]);

/** Plain-text summary of a profile, built only from stored fields. */
async function describe(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: { select: { role: true } },
      geography: true,
      entrepreneur: true,
      investor: { include: { organization: true, preference: { include: { sectors: true, geographies: true } } } },
      founderOf: { include: { startup: { include: { industry: true, sectors: true, geography: true } } } },
    },
  });
  if (!profile) throw notFound('That profile does not exist.');

  const parts = [`${profile.displayName}${profile.headline ? `, ${profile.headline}` : ''}`];
  if (profile.geography) parts.push(`Based in ${profile.geography.name}.`);
  if (profile.bio) parts.push(profile.bio);

  const startup = profile.founderOf[0]?.startup;
  if (startup) {
    parts.push(`Company: ${startup.name}. ${startup.oneLiner}`);
    if (startup.description) parts.push(startup.description);
    parts.push(`Industry ${startup.industry.name}; sectors ${startup.sectors.map((s) => s.name).join(', ')}; stage ${STAGE_LABEL[startup.stage]}.`);
    if (startup.amountSeeking != null) parts.push(`Raising ${money(startup.amountSeeking, startup.currency)}.`);
    if (startup.revenueAnnual != null) parts.push(`Annual revenue ${money(startup.revenueAnnual, startup.currency)}.`);
    if (startup.userCount != null) parts.push(`${startup.userCount} users.`);
    if (startup.customerCount != null) parts.push(`${startup.customerCount} customers.`);
    if (startup.tractionNote) parts.push(`Traction note: ${startup.tractionNote}`);
  }

  const investor = profile.investor;
  if (investor) {
    parts.push(`${INVESTOR_TYPE_LABEL[investor.investorType]}${investor.organization ? ` at ${investor.organization.name}` : ''}.`);
    if (investor.thesis) parts.push(`Thesis: ${investor.thesis}`);
    if (investor.preference) {
      parts.push(`Invests ${money(investor.preference.minCheque, investor.preference.currency)} to ${money(investor.preference.maxCheque, investor.preference.currency)} at ${investor.preference.stages.map((s) => STAGE_LABEL[s]).join(', ')}.`);
      parts.push(`Sectors: ${investor.preference.sectors.map((s) => s.name).join(', ')}.`);
    }
    if (investor.expertise.length) parts.push(`Expertise: ${investor.expertise.join(', ')}.`);
  }

  return parts.join(' ');
}

export async function POST(request: NextRequest) {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    await enforce('ai', user.id);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const input = parsed.data;

    let draft;
    if (input.feature === 'profile') {
      draft = await ai.profileText(user.id, input.kind, input.rough);
    } else if (input.feature === 'introduction') {
      const [mine, theirs] = await Promise.all([describe(user.id), describe(input.recipientId)]);
      draft = await ai.introMessage(user.id, { senderSummary: mine, recipientSummary: theirs, context: input.context });
    } else {
      if (user.role !== 'INVESTOR' && user.role !== 'ADMIN') {
        throw forbidden('Startup summaries are for investor accounts.');
      }
      const subject = await prisma.profile.findUnique({
        where: { userId: input.subjectUserId },
        select: { visibility: true },
      });
      if (!subject) throw notFound('That profile does not exist.');
      if (subject.visibility === 'PRIVATE') throw forbidden('That profile is private.');
      if (subject.visibility === 'CONNECTION_ONLY' && !(await areConnected(user.id, input.subjectUserId))) {
        throw forbidden('That profile is only visible to their connections.');
      }
      draft = await ai.startupSummary(user.id, await describe(input.subjectUserId));
    }

    await track('ai_feature_used', user.id, { feature: input.feature });

    return NextResponse.json({
      draft: draft.draft,
      // The interface labels output as generated and requires the user to accept it.
      generated: true,
      provider: draft.provider,
      configured: aiConfigured,
    });
  } catch (err) {
    const { message, status } = toPublicError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
