import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { discoverInvestors, discoverStartups } from '@/server/discovery';
import { listConnections } from '@/server/connections';
import { listConversations } from '@/server/messages';
import { listIntroductions } from '@/server/introductions';
import { savedIds } from '@/server/saved';
import { completionFor } from '@/server/profiles';
import { PersonCard } from '@/components/app/PersonCard';
import { Card, ButtonLink, EmptyState, Avatar, Chip } from '@/components/ui';
import { timeAgo } from '@/lib/utils/format';
import type { DiscoverQuery } from '@/lib/validation/schemas';

export const metadata: Metadata = { title: 'Home' };
export const dynamic = 'force-dynamic';

const baseQuery: DiscoverQuery = { sort: 'relevance', page: 1 };

function CompletionMeter({ percent, missing }: { percent: number; missing: string[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px]">Your profile</h2>
        <p className="text-[14px] text-ink-soft">{percent}% complete</p>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-line overflow-hidden" role="img" aria-label={`Profile ${percent} percent complete`}>
        <div className="h-full bg-brass rounded-full transition-[width] duration-500" style={{ width: `${Math.max(percent, 3)}%` }} />
      </div>
      {missing.length > 0 ? (
        <>
          <p className="mt-4 text-[13px] text-muted">A fuller profile gets better matches. Still to do:</p>
          <ul className="mt-2 grid gap-1.5">
            {missing.slice(0, 3).map((m) => (
              <li key={m} className="text-[13.5px] text-ink-soft flex gap-2">
                <span className="text-brass" aria-hidden>·</span>{m}
              </li>
            ))}
          </ul>
          <ButtonLink href="/settings" variant="secondary" size="sm" className="mt-4">Update your profile</ButtonLink>
        </>
      ) : (
        <p className="mt-4 text-[13.5px] text-signal">Everything is filled in. Nothing to do here.</p>
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const isFounder = user.role !== 'INVESTOR';

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { id: true, role: true, status: true, email: true, emailVerifiedAt: true, isDemo: true } },
      geography: true,
      entrepreneur: true,
      investor: {
        include: {
          organization: true,
          portfolio: { include: { sector: true }, orderBy: { year: 'desc' } },
          preference: { include: { sectors: true, industries: true, geographies: true } },
        },
      },
      founderOf: { include: { startup: { include: { industry: true, sectors: true, geography: true } } } },
    },
  });

  const completion = profile ? completionFor(profile) : { percent: 0, missing: [] };

  const [recommended, connectionData, conversations, intros, saved] = await Promise.all([
    isFounder ? discoverInvestors(user.id, baseQuery) : discoverStartups(user.id, baseQuery),
    listConnections(user.id),
    listConversations(user.id),
    listIntroductions(user.id),
    savedIds(user.id),
  ]);

  const top = recommended.items.slice(0, 4);
  const pending = connectionData.incoming.length;

  const nextSteps = [
    completion.percent < 100 ? { label: completion.missing[0] ?? 'Finish your profile', href: '/settings' } : null,
    pending > 0 ? { label: `Respond to ${pending} connection request${pending === 1 ? '' : 's'}`, href: '/connections' } : null,
    intros.incoming.length > 0 ? { label: `${intros.incoming.length} introduction request${intros.incoming.length === 1 ? '' : 's'} waiting`, href: '/connections' } : null,
    top.length > 0 ? { label: isFounder ? 'Reach out to an investor who fits' : 'Look at a company that fits your thesis', href: '/discover' } : null,
    { label: isFounder ? 'Widen your search on Discover' : 'Filter deal flow on Discover', href: '/discover' },
  ].filter(Boolean).slice(0, 3) as Array<{ label: string; href: string }>;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-[clamp(1.6rem,4vw,2.1rem)]">
          {user.displayName.split(' ')[0]}, here is who is relevant to you today
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          {isFounder
            ? 'Investors whose stated remit covers what you are building.'
            : 'Companies that sit inside the thesis you set out.'}
        </p>
      </div>

      {!user.emailVerifiedAt && (
        <Card className="p-4 border-brass/30 bg-brass-soft/40">
          <p className="text-[13.5px] text-ink">
            Confirm your email address to get the verified badge on your profile. Check your inbox, or{' '}
            <Link href="/settings/account" className="underline underline-offset-2">send the link again</Link>.
          </p>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:gap-10">
        <section aria-labelledby="recs">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 id="recs" className="text-[19px]">{isFounder ? 'Recommended investors' : 'Recommended startups'}</h2>
            <Link href="/discover" className="text-[13.5px] text-muted hover:text-ink">See all</Link>
          </div>

          {top.length === 0 ? (
            <EmptyState
              title={isFounder ? 'No investor matches yet' : 'No companies match yet'}
              body={
                completion.percent < 60
                  ? 'Fill in more of your profile and Doorkey will have something to match on.'
                  : 'Nothing clears the relevance bar right now. Try widening your filters on Discover.'
              }
              action={<ButtonLink href={completion.percent < 60 ? '/settings' : '/discover'}>
                {completion.percent < 60 ? 'Finish your profile' : 'Open Discover'}
              </ButtonLink>}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {top.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  saved={saved.has(p.userId)}
                  connectionState={
                    connectionData.connections.some((c) => c.user.id === p.userId) ? 'connected'
                    : connectionData.outgoing.some((r) => r.recipientId === p.userId) ? 'pending_outgoing'
                    : connectionData.incoming.some((r) => r.requesterId === p.userId) ? 'pending_incoming'
                    : 'none'
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <aside className="grid gap-5 content-start">
          <CompletionMeter percent={completion.percent} missing={completion.missing} />

          <Card className="p-5">
            <h2 className="text-[16px]">What to do next</h2>
            <ul className="mt-3 grid gap-2.5">
              {nextSteps.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="text-[13.5px] text-ink-soft hover:text-ink flex gap-2 leading-snug">
                    <span className="text-brass mt-[1px]" aria-hidden>·</span>{s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[16px]">Connections</h2>
              <Link href="/connections" className="text-[13px] text-muted hover:text-ink">Manage</Link>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-muted">Connected</dt>
                <dd className="text-[19px]" style={{ fontFamily: 'var(--font-display)' }}>{connectionData.connections.length}</dd>
              </div>
              <div>
                <dt className="text-muted">Waiting on you</dt>
                <dd className="text-[19px]" style={{ fontFamily: 'var(--font-display)' }}>{pending}</dd>
              </div>
            </dl>
            {pending > 0 && (
              <ButtonLink href="/connections" size="sm" className="mt-4 w-full">Review requests</ButtonLink>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[16px]">Messages</h2>
              <Link href="/messages" className="text-[13px] text-muted hover:text-ink">Open</Link>
            </div>
            {conversations.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-muted leading-relaxed">
                Nothing yet. Messaging opens once a connection request is accepted.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {conversations.slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link href={`/messages/${c.id}`} className="flex items-center gap-2.5 group">
                      <Avatar name={c.profile?.displayName ?? '?'} src={c.profile?.photoUrl} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] truncate group-hover:text-brass">{c.profile?.displayName}</span>
                        <span className="block text-[12px] text-muted truncate">
                          {c.lastMessage?.body ?? 'No messages yet'}
                        </span>
                      </span>
                      {c.unread > 0 && <Chip tone="brass">{c.unread}</Chip>}
                      <span className="sr-only">{timeAgo(c.lastMessageAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
