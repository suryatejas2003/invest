import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { listConversations } from '@/server/messages';
import { Avatar, Card, Chip, EmptyState, ButtonLink } from '@/components/ui';
import { timeAgo } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Messages' };
export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await listConversations(user.id);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[clamp(1.6rem,4vw,2.1rem)]">Messages</h1>
        <p className="mt-2 text-[15px] text-muted">Conversations open once a connection request is accepted.</p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="Once someone accepts your connection request, or you accept theirs, a conversation opens here."
          action={<ButtonLink href="/discover">Find people to connect with</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-2">
          {conversations.map((c) => (
            <Card as="li" key={c.id} className="p-0">
              <Link href={`/messages/${c.id}`} className="flex items-center gap-4 p-4 group">
                <Avatar name={c.profile?.displayName ?? '?'} src={c.profile?.photoUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] leading-tight group-hover:text-brass">{c.profile?.displayName ?? 'A member'}</p>
                    <span className="text-[12px] text-muted shrink-0">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <p className={`text-[13.5px] truncate mt-0.5 ${c.unread > 0 ? 'text-ink' : 'text-muted'}`}>
                    {c.lastMessage?.body ?? 'No messages yet — say hello.'}
                  </p>
                </div>
                {c.unread > 0 && <Chip tone="brass">{c.unread} new</Chip>}
              </Link>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
