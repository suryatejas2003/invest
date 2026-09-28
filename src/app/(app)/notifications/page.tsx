import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { Card, EmptyState, ButtonLink, Avatar } from '@/components/ui';
import { markNotificationsReadAction } from '@/server/actions/network';
import { Button } from '@/components/ui';
import { timeAgo } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { actor: { include: { profile: { select: { displayName: true, photoUrl: true, slug: true } } } } },
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="grid gap-6 max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.6rem,4vw,2.1rem)]">Notifications</h1>
          <p className="mt-2 text-[15px] text-muted">{unread > 0 ? `${unread} unread` : 'You are up to date.'}</p>
        </div>
        {unread > 0 && (
          <form action={markNotificationsReadAction}>
            <Button type="submit" variant="secondary" size="sm">Mark all as read</Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Connection requests, accepted introductions and new messages will appear here."
          action={<ButtonLink href="/discover">Find people to connect with</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-2">
          {notifications.map((n) => {
            const content = (
              <div className={`flex gap-3.5 p-4 ${n.readAt ? '' : 'bg-brass-soft/30'}`}>
                <Avatar name={n.actor?.profile?.displayName ?? 'Doorkey'} src={n.actor?.profile?.photoUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] leading-snug">{n.title}</p>
                  {n.body && <p className="text-[13px] text-muted mt-1 leading-snug">{n.body}</p>}
                  <p className="text-[12px] text-muted mt-1.5">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.readAt && <span className="w-2 h-2 rounded-full bg-brass mt-2 shrink-0" aria-label="Unread" />}
              </div>
            );
            return (
              <Card as="li" key={n.id} className="p-0 overflow-hidden">
                {n.url ? <Link href={n.url} className="block hover:bg-paper">{content}</Link> : content}
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
