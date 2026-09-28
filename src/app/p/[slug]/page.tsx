import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getViewableProfile } from '@/server/profiles';
import { connectionStateWith } from '@/server/connections';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { Avatar, Card, Chip, ButtonLink, VerifiedMark, DemoTag, EmptyState } from '@/components/ui';
import { ConnectForm, IntroductionForm, SaveToggle, SafetyPanel, RemoveConnectionForm } from '@/components/app/ActionForms';
import { money, compactNumber } from '@/lib/utils/format';
import { STAGE_LABEL, INVESTOR_TYPE_LABEL, BUSINESS_MODEL_LABEL, GOAL_LABEL, VERIFICATION_LABEL } from '@/lib/config/vocab';
import { track } from '@/lib/services/analytics';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await prisma.profile.findUnique({ where: { slug }, select: { displayName: true, headline: true, visibility: true } });
  if (!profile || profile.visibility !== 'PUBLIC') return { title: 'Profile', robots: { index: false } };
  return { title: profile.displayName, description: profile.headline ?? undefined };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-[17px] threshold">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ items }: { items: Array<[string, string | null | undefined]> }) {
  const present = items.filter(([, v]) => v);
  if (!present.length) return null;
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
      {present.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[12.5px] text-muted">{label}</dt>
          <dd className="text-[15px] text-ink mt-0.5 capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getSessionUser();

  let result: Awaited<ReturnType<typeof getViewableProfile>>;
  try {
    result = await getViewableProfile(slug, viewer?.id ?? null);
  } catch (err) {
    if (err instanceof AppError && err.status === 403) {
      return (
        <main id="main" className="mx-auto max-w-2xl px-5 py-24">
          <EmptyState title="This profile is private" body="The person who owns it has chosen not to show it." />
        </main>
      );
    }
    notFound();
  }

  if (result.restricted) {
    const p = result.profile;
    return (
      <main id="main" className="mx-auto max-w-2xl px-5 py-20">
        <Card className="p-8 text-center grid gap-4 justify-items-center">
          <Avatar name={p.displayName} src={p.photoUrl} size={64} />
          <div>
            <h1 className="text-[24px]">{p.displayName}</h1>
            {p.headline && <p className="text-[14px] text-muted mt-1">{p.headline}</p>}
          </div>
          <p className="text-[14px] text-muted max-w-sm leading-relaxed">
            This profile is only visible to their connections. Send a request and they can decide.
          </p>
          {viewer ? <ConnectForm recipientId={''} /> : <ButtonLink href="/login">Sign in to connect</ButtonLink>}
        </Card>
      </main>
    );
  }

  const { profile, isSelf, connected, email } = result;
  const state = viewer && !isSelf ? await connectionStateWith(viewer.id, profile.userId) : { state: 'self' as const };
  const saved = viewer && !isSelf
    ? Boolean(await prisma.savedProfile.findUnique({ where: { ownerId_subjectId: { ownerId: viewer.id, subjectId: profile.userId } } }))
    : false;

  if (viewer && !isSelf) await track('profile_viewed', viewer.id, { role: profile.user.role });

  const startup = profile.founderOf[0]?.startup;
  const investor = profile.investor;
  const verifications = await prisma.verification.findMany({ where: { userId: profile.userId, status: 'VERIFIED' } });

  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-10 md:py-14">
      <Link href={viewer ? '/discover' : '/'} className="text-[13.5px] text-muted hover:text-ink">Back</Link>

      <header className="mt-5 flex flex-wrap items-start gap-5 pb-8 border-b border-line">
        <Avatar name={profile.displayName} src={profile.photoUrl} size={84} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[clamp(1.6rem,4vw,2.2rem)] leading-tight">{profile.displayName}</h1>
            {profile.user.isDemo && <DemoTag />}
          </div>
          {profile.headline && <p className="mt-1.5 text-[16px] text-ink-soft">{profile.headline}</p>}
          <p className="mt-1 text-[14px] text-muted">
            {profile.user.role === 'INVESTOR'
              ? [investor?.organization?.name, investor ? INVESTOR_TYPE_LABEL[investor.investorType] : null].filter(Boolean).join(' · ')
              : [startup?.name, profile.founderOf[0]?.title].filter(Boolean).join(' · ')}
            {profile.geography && ` · ${profile.geography.name}`}
          </p>

          {verifications.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-3">
              {verifications.map((v) => (
                <li key={v.id}><VerifiedMark label={VERIFICATION_LABEL[v.type]} /></li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-2 w-full sm:w-auto">
          {isSelf ? (
            <ButtonLink href="/settings" variant="secondary">Edit your profile</ButtonLink>
          ) : !viewer ? (
            <ButtonLink href={`/login?next=/p/${slug}`}>Sign in to connect</ButtonLink>
          ) : state.state === 'connected' ? (
            <>
              <Chip tone="signal">Connected</Chip>
              {'conversationId' in state && state.conversationId && (
                <ButtonLink href={`/messages/${state.conversationId}`} size="sm">Send a message</ButtonLink>
              )}
            </>
          ) : state.state === 'pending_outgoing' ? (
            <Chip tone="brass">Request pending</Chip>
          ) : state.state === 'pending_incoming' ? (
            <ButtonLink href="/connections" size="sm">They asked to connect</ButtonLink>
          ) : (
            <>
              <ConnectForm recipientId={profile.userId} />
              <IntroductionForm targetId={profile.userId} />
            </>
          )}
          {viewer && !isSelf && <SaveToggle userId={profile.userId} saved={saved} />}
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:gap-12 pt-8">
        <div className="grid gap-10">
          {profile.bio && (
            <Section title="About">
              <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-line max-w-[68ch]">{profile.bio}</p>
            </Section>
          )}

          {/* ------------------------------------------- entrepreneur view */}
          {profile.user.role === 'ENTREPRENEUR' && startup && (
            <>
              <Section title={startup.name}>
                <p className="text-[16px] text-ink leading-relaxed">{startup.oneLiner}</p>
                {startup.description && (
                  <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-line max-w-[68ch]">{startup.description}</p>
                )}
                <ul className="flex flex-wrap gap-1.5 mt-1">
                  {startup.sectors.map((s) => <li key={s.id}><Chip>{s.name}</Chip></li>)}
                </ul>
                <Facts items={[
                  ['Industry', startup.industry.name],
                  ['Stage', STAGE_LABEL[startup.stage]],
                  ['Model', BUSINESS_MODEL_LABEL[startup.businessModel]],
                  ['Location', startup.geography?.name],
                  ['Founded', startup.foundedYear ? String(startup.foundedYear) : null],
                  ['Team', startup.teamSize ? `${startup.teamSize} people` : null],
                ]} />
              </Section>

              <Section title="Funding">
                <Facts items={[
                  ['Raising', startup.amountSeeking != null ? money(startup.amountSeeking, startup.currency) : null],
                  ['Raised to date', startup.amountRaised != null ? money(startup.amountRaised, startup.currency) : null],
                  ['Previous rounds', startup.previousFunding],
                ]} />
              </Section>

              {(startup.revenueAnnual || startup.userCount || startup.customerCount || startup.growthNote || startup.tractionNote) && (
                <Section title="Traction">
                  <Facts items={[
                    ['Annual revenue', startup.revenueAnnual != null ? money(startup.revenueAnnual, startup.currency) : null],
                    ['Users', startup.userCount != null ? compactNumber(startup.userCount) : null],
                    ['Customers', startup.customerCount != null ? compactNumber(startup.customerCount) : null],
                    ['Growth', startup.growthNote],
                  ]} />
                  {startup.tractionNote && (
                    <p className="text-[14.5px] leading-relaxed text-ink-soft max-w-[68ch]">{startup.tractionNote}</p>
                  )}
                </Section>
              )}

              {profile.entrepreneur && profile.entrepreneur.goals.length > 0 && (
                <Section title="What they are looking for">
                  <ul className="flex flex-wrap gap-1.5">
                    {profile.entrepreneur.goals.map((g) => <li key={g}><Chip tone="signal">{GOAL_LABEL[g]}</Chip></li>)}
                  </ul>
                </Section>
              )}
            </>
          )}

          {/* ------------------------------------------------ investor view */}
          {profile.user.role === 'INVESTOR' && investor && (
            <>
              {investor.thesis && (
                <Section title="Investment thesis">
                  <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-line max-w-[68ch]">{investor.thesis}</p>
                </Section>
              )}

              <Section title="How they invest">
                <Facts items={[
                  ['Type', INVESTOR_TYPE_LABEL[investor.investorType]],
                  ['Cheque size', investor.preference ? `${money(investor.preference.minCheque, investor.preference.currency)} – ${money(investor.preference.maxCheque, investor.preference.currency)}` : null],
                  ['Stages', investor.preference?.stages.map((s) => STAGE_LABEL[s]).join(', ')],
                  ['Geographies', investor.preference?.geographies.map((g) => g.name).join(', ')],
                ]} />
                {investor.preference && investor.preference.sectors.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 mt-1">
                    {investor.preference.sectors.map((s) => <li key={s.id}><Chip>{s.name}</Chip></li>)}
                  </ul>
                )}
              </Section>

              {investor.expertise.length > 0 && (
                <Section title="Areas of expertise">
                  <ul className="flex flex-wrap gap-1.5">
                    {investor.expertise.map((e) => <li key={e}><Chip tone="brass">{e}</Chip></li>)}
                  </ul>
                </Section>
              )}

              {investor.portfolio.length > 0 && (
                <Section title="Portfolio">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {investor.portfolio.map((c) => (
                      <li key={c.id} className="border border-line rounded-[8px] px-3.5 py-3">
                        <p className="text-[14.5px]">{c.name}</p>
                        <p className="text-[12.5px] text-muted mt-0.5">
                          {[c.sector?.name, c.year ? String(c.year) : null].filter(Boolean).join(' · ')}
                        </p>
                        {c.note && <p className="text-[13px] text-ink-soft mt-1.5 leading-snug">{c.note}</p>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}
        </div>

        <aside className="grid gap-5 content-start">
          <Card className="p-5 grid gap-3">
            <h2 className="text-[15px]">Links</h2>
            {profile.linkedinUrl || profile.websiteUrl || startup?.websiteUrl || email ? (
              <ul className="grid gap-2 text-[13.5px]">
                {profile.linkedinUrl && <li><a href={profile.linkedinUrl} rel="noopener noreferrer nofollow" target="_blank" className="text-ink underline underline-offset-2 break-all">LinkedIn</a></li>}
                {profile.websiteUrl && <li><a href={profile.websiteUrl} rel="noopener noreferrer nofollow" target="_blank" className="text-ink underline underline-offset-2 break-all">Personal site</a></li>}
                {startup?.websiteUrl && <li><a href={startup.websiteUrl} rel="noopener noreferrer nofollow" target="_blank" className="text-ink underline underline-offset-2 break-all">{startup.name}</a></li>}
                {email && <li className="text-muted break-all">{email}</li>}
              </ul>
            ) : (
              <p className="text-[13px] text-muted">None shared.</p>
            )}
          </Card>

          {connected && !isSelf && (
            <Card className="p-5">
              <h2 className="text-[15px] mb-2">Connection</h2>
              <RemoveConnectionForm userId={profile.userId} />
            </Card>
          )}

          {viewer && !isSelf && (
            <Card className="p-5">
              <SafetyPanel userId={profile.userId} startupId={startup?.id} blocked={state.state === 'blocked'} />
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}
