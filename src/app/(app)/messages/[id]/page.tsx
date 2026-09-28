import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getConversation } from '@/server/messages';
import { Avatar, Card } from '@/components/ui';
import { MessageComposer } from '@/components/app/MessageComposer';
import { timeAgo } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Conversation' };
export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  let conversation: Awaited<ReturnType<typeof getConversation>>;
  try {
    conversation = await getConversation(user.id, id);
  } catch {
    notFound();
  }

  return (
    <div className="grid gap-5 max-w-3xl">
      <Link href="/messages" className="text-[13.5px] text-muted hover:text-ink">All messages</Link>

      <header className="flex items-center gap-3 pb-4 border-b border-line">
        <Avatar name={conversation.profile?.displayName ?? '?'} src={conversation.profile?.photoUrl} size={44} />
        <div className="min-w-0">
          <h1 className="text-[19px] leading-tight">
            {conversation.profile?.slug ? (
              <Link href={`/p/${conversation.profile.slug}`} className="hover:text-brass">{conversation.profile.displayName}</Link>
            ) : (conversation.profile?.displayName ?? 'A member')}
          </h1>
          {conversation.profile?.headline && <p className="text-[13px] text-muted truncate">{conversation.profile.headline}</p>}
        </div>
      </header>

      {conversation.messages.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[15px]">No messages yet.</p>
          <p className="text-[13.5px] text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
            Say what you are working on and what you are hoping for. Short beats polished.
          </p>
        </Card>
      ) : (
        <ol className="grid gap-3">
          {conversation.messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <li key={m.id} className={mine ? 'justify-self-end max-w-[85%]' : 'justify-self-start max-w-[85%]'}>
                <div className={`rounded-[10px] px-3.5 py-2.5 border ${mine ? 'bg-ink text-paper border-ink' : 'bg-paper-raised border-line'}`}>
                  <p className="text-[14.5px] leading-relaxed whitespace-pre-line">{m.body}</p>
                </div>
                <p className={`text-[11.5px] text-muted mt-1 ${mine ? 'text-right' : ''}`}>
                  <time dateTime={m.createdAt.toISOString()}>{timeAgo(m.createdAt)}</time>
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="sticky bottom-20 md:bottom-4 bg-paper pt-2">
        <MessageComposer conversationId={conversation.id} />
      </div>
    </div>
  );
}
