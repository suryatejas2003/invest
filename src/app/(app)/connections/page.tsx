import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { listConnections } from '@/server/connections';
import { listIntroductions } from '@/server/introductions';
import { Avatar, Card, EmptyState, ButtonLink, Chip } from '@/components/ui';
import { RespondForm, WithdrawForm, RespondIntroductionForm } from '@/components/app/ActionForms';
import { timeAgo } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Connections' };
export const dynamic = 'force-dynamic';

function Row({ name, slug, headline, photoUrl, meta, children }: {
  name: string; slug?: string | null; headline?: string | null; photoUrl?: string | null; meta?: string; children?: React.ReactNode;
}) {
  return (
    <Card as="li" className="p-4 flex flex-wrap items-center gap-4">
      <Avatar name={name} src={photoUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-tight">
          {slug ? <Link href={`/p/${slug}`} className="hover:text-brass">{name}</Link> : name}
        </p>
        {headline && <p className="text-[13px] text-muted truncate">{headline}</p>}
        {meta && <p className="text-[12.5px] text-muted mt-0.5">{meta}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </Card>
  );
}

export default async function ConnectionsPage() {
  const user = await requireUser();
  const [{ connections, incoming, outgoing }, intros] = await Promise.all([
    listConnections(user.id),
    listIntroductions(user.id),
  ]);

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-[clamp(1.6rem,4vw,2.1rem)]">Connections</h1>
        <p className="mt-2 text-[15px] text-muted">Requests waiting on you, requests you have sent, and everyone you are connected with.</p>
      </div>

      <section aria-labelledby="incoming" className="grid gap-4">
        <h2 id="incoming" className="text-[19px]">
          Waiting on you {incoming.length > 0 && <Chip tone="brass">{incoming.length}</Chip>}
        </h2>
        {incoming.length === 0 && intros.incoming.length === 0 ? (
          <p className="text-[14px] text-muted">Nothing to respond to right now.</p>
        ) : (
          <ul className="grid gap-3">
            {incoming.map((r) => (
              <Row
                key={r.id}
                name={r.requester.profile?.displayName ?? 'A member'}
                slug={r.requester.profile?.slug}
                headline={r.requester.profile?.headline}
                photoUrl={r.requester.profile?.photoUrl}
                meta={r.message ? `“${r.message.slice(0, 120)}”` : `Asked ${timeAgo(r.createdAt)}`}
              >
                <RespondForm requestId={r.id} />
              </Row>
            ))}
            {intros.incoming.map((r) => (
              <Row
                key={r.id}
                name={r.requester.profile?.displayName ?? 'A member'}
                slug={r.requester.profile?.slug}
                headline="Asked for an introduction"
                photoUrl={r.requester.profile?.photoUrl}
                meta={r.message ? `“${r.message.slice(0, 120)}”` : undefined}
              >
                <RespondIntroductionForm introId={r.id} />
              </Row>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="outgoing" className="grid gap-4">
        <h2 id="outgoing" className="text-[19px]">Sent by you</h2>
        {outgoing.length === 0 ? (
          <p className="text-[14px] text-muted">You have no requests outstanding.</p>
        ) : (
          <ul className="grid gap-3">
            {outgoing.map((r) => (
              <Row
                key={r.id}
                name={r.recipient.profile?.displayName ?? 'A member'}
                slug={r.recipient.profile?.slug}
                headline={r.recipient.profile?.headline}
                photoUrl={r.recipient.profile?.photoUrl}
                meta={`Sent ${timeAgo(r.createdAt)}`}
              >
                <WithdrawForm requestId={r.id} />
              </Row>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="connected" className="grid gap-4">
        <h2 id="connected" className="text-[19px]">Connected</h2>
        {connections.length === 0 ? (
          <EmptyState
            title="No connections yet"
            body="Find people whose work lines up with yours, send a request, and they will show here once accepted."
            action={<ButtonLink href="/discover">Open Discover</ButtonLink>}
          />
        ) : (
          <ul className="grid gap-3">
            {connections.map((c) => (
              <Row
                key={c.connectionId}
                name={c.profile?.displayName ?? 'A member'}
                slug={c.profile?.slug}
                headline={c.profile?.headline}
                photoUrl={c.profile?.photoUrl}
                meta={`Connected ${timeAgo(c.since)}`}
              >
                {c.conversationId && <ButtonLink href={`/messages/${c.conversationId}`} size="sm" variant="secondary">Message</ButtonLink>}
              </Row>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
