import 'server-only';
import { prisma } from '@/lib/db';
import { badRequest, conflict, forbidden, notFound } from '@/lib/errors';
import { notify } from '@/lib/services/notifications';
import { emails } from '@/lib/services/email';
import { track } from '@/lib/services/analytics';
import { enforce } from '@/lib/auth/rate-limit';
import { orderPair } from '@/lib/connections/rules';
import { areConnected, isBlockedEitherWay } from './profiles';

/**
 * An introduction request is a lighter ask than a connection request: "I'd
 * like to be put in front of you". `connectorId` is unused in this version but
 * exists so a third party can broker the introduction later (§17).
 */
export async function requestIntroduction(requesterId: string, targetId: string, message?: string) {
  await enforce('introduction', requesterId);
  if (requesterId === targetId) throw badRequest('You cannot ask to be introduced to yourself.');

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { status: true, email: true, notifyByEmail: true, notifyOnRequest: true } });
  if (!target || target.status !== 'ACTIVE') throw notFound('That person is not available.');
  if (await isBlockedEitherWay(requesterId, targetId)) throw forbidden('That person is not accepting requests from you.');
  if (await areConnected(requesterId, targetId)) throw conflict('You are already connected — just send a message.');

  const open = await prisma.introductionRequest.findFirst({ where: { requesterId, targetId, status: 'PENDING' } });
  if (open) throw conflict('You already have an introduction request pending with them.');

  const intro = await prisma.introductionRequest.create({ data: { requesterId, targetId, message: message || null } });

  const requester = await prisma.profile.findUnique({ where: { userId: requesterId }, select: { displayName: true } });
  const name = requester?.displayName ?? 'A Doorkey member';

  await notify({
    userId: targetId, actorId: requesterId, type: 'INTRODUCTION_REQUEST',
    title: `${name} asked for an introduction`,
    body: message?.slice(0, 160), url: '/connections', entityId: intro.id,
  });
  if (target.notifyByEmail && target.notifyOnRequest) await emails.introductionRequest(target.email, name);
  await track('introduction_requested', requesterId);

  return intro;
}

export async function respondToIntroduction(userId: string, introId: string, action: 'accept' | 'decline') {
  const intro = await prisma.introductionRequest.findUnique({ where: { id: introId } });
  if (!intro) throw notFound('That request no longer exists.');
  if (intro.targetId !== userId) throw forbidden('Only the person asked can respond to this.');
  if (intro.status !== 'PENDING') throw badRequest('This request has already been dealt with.');

  if (action === 'decline') {
    await prisma.introductionRequest.update({ where: { id: introId }, data: { status: 'DECLINED', respondedAt: new Date() } });
    return { connected: false };
  }

  const [a, b] = orderPair(intro.requesterId, intro.targetId);

  const result = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: { participants: { create: [{ userId: intro.requesterId }, { userId: intro.targetId }] } },
    });
    await tx.introductionRequest.update({
      where: { id: introId },
      data: { status: 'ACCEPTED', respondedAt: new Date(), conversationId: conversation.id },
    });
    // Accepting an introduction opens the door: it establishes the connection.
    const existing = await tx.connection.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
    if (!existing) {
      await tx.connection.create({ data: { userAId: a, userBId: b, conversationId: conversation.id } });
    }
    return conversation;
  });

  const accepter = await prisma.profile.findUnique({ where: { userId }, select: { displayName: true } });
  await notify({
    userId: intro.requesterId, actorId: userId, type: 'INTRODUCTION_ACCEPTED',
    title: `${accepter?.displayName ?? 'They'} accepted your introduction request`,
    body: 'You can message each other now.', url: `/messages/${result.id}`, entityId: intro.id,
  });
  await track('introduction_accepted', userId);

  return { connected: true, conversationId: result.id };
}

export async function listIntroductions(userId: string) {
  const [incoming, outgoing] = await Promise.all([
    prisma.introductionRequest.findMany({
      where: { targetId: userId, status: 'PENDING' },
      include: { requester: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.introductionRequest.findMany({
      where: { requesterId: userId },
      include: { target: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);
  return { incoming, outgoing };
}
