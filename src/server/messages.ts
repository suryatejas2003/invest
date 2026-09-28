import 'server-only';
import { prisma } from '@/lib/db';
import { forbidden, notFound } from '@/lib/errors';
import { notify } from '@/lib/services/notifications';
import { track } from '@/lib/services/analytics';
import { enforce } from '@/lib/auth/rate-limit';
import { areConnected } from './profiles';

/** Membership check. Every read and write in this module goes through it. */
async function assertParticipant(userId: string, conversationId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw forbidden('You do not have access to this conversation.');
  return participant;
}

export async function listConversations(userId: string) {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    orderBy: { conversation: { lastMessageAt: 'desc' } },
    include: {
      conversation: {
        include: {
          participants: { where: { userId: { not: userId } }, include: { user: { include: { profile: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  const rows = await Promise.all(
    participations.map(async (p) => {
      const other = p.conversation.participants[0];
      const unread = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
      return {
        id: p.conversationId,
        other: other?.user ?? null,
        profile: other?.user.profile ?? null,
        lastMessage: p.conversation.messages[0] ?? null,
        lastMessageAt: p.conversation.lastMessageAt,
        unread,
      };
    }),
  );

  return rows.filter((r) => r.other !== null);
}

export async function getConversation(userId: string, conversationId: string, opts: { take?: number; before?: Date } = {}) {
  await assertParticipant(userId, conversationId);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: { include: { profile: true } } } },
      messages: {
        where: opts.before ? { createdAt: { lt: opts.before } } : undefined,
        orderBy: { createdAt: 'desc' },
        take: opts.take ?? 50,
      },
    },
  });
  if (!conversation) throw notFound('That conversation does not exist.');

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });

  const other = conversation.participants.find((p) => p.userId !== userId);
  return {
    id: conversation.id,
    messages: conversation.messages.reverse(),
    other: other?.user ?? null,
    profile: other?.user.profile ?? null,
  };
}

export async function sendMessage(userId: string, conversationId: string, body: string) {
  await enforce('message', userId);
  await assertParticipant(userId, conversationId);

  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: userId } },
    include: { user: { select: { id: true, status: true } } },
  });
  if (!other) throw notFound('There is nobody else in this conversation.');
  if (other.user.status !== 'ACTIVE') throw forbidden('That person is no longer active on Doorkey.');

  // Messaging is only open between connected people (§16).
  if (!(await areConnected(userId, other.userId))) {
    throw forbidden('You can only message people you are connected with.');
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: userId, body } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  const sender = await prisma.profile.findUnique({ where: { userId }, select: { displayName: true } });
  await notify({
    userId: other.userId, actorId: userId, type: 'NEW_MESSAGE',
    title: `New message from ${sender?.displayName ?? 'a connection'}`,
    body: body.slice(0, 120), url: `/messages/${conversationId}`, entityId: message.id,
  });
  await track('message_sent', userId);

  return message;
}

export async function totalUnread(userId: string) {
  const participations = await prisma.conversationParticipant.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } });
  if (participations.length === 0) return 0;
  const counts = await Promise.all(
    participations.map((p) =>
      prisma.message.count({
        where: { conversationId: p.conversationId, senderId: { not: userId }, ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}) },
      }),
    ),
  );
  return counts.reduce((a, b) => a + b, 0);
}
