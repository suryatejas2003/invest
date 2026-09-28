import 'server-only';
import { prisma } from '@/lib/db';
import { badRequest, conflict, notFound } from '@/lib/errors';
import { canAct, canSendRequest, orderPair } from '@/lib/connections/rules';
import { notify } from '@/lib/services/notifications';
import { emails } from '@/lib/services/email';
import { track } from '@/lib/services/analytics';
import { enforce } from '@/lib/auth/rate-limit';

async function nameFor(userId: string) {
  const p = await prisma.profile.findUnique({ where: { userId }, select: { displayName: true, slug: true } });
  return { name: p?.displayName ?? 'A Doorkey member', slug: p?.slug ?? '' };
}

export async function sendConnectionRequest(senderId: string, recipientId: string, message?: string) {
  await enforce('connectionRequest', senderId);

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, status: true, email: true, notifyByEmail: true, notifyOnRequest: true } });
  if (!recipient || recipient.status !== 'ACTIVE') throw notFound('That person is not available.');

  const [a, b] = orderPair(senderId, recipientId);
  const [existingRequest, connection, block] = await Promise.all([
    prisma.connectionRequest.findFirst({
      where: { OR: [{ requesterId: senderId, recipientId }, { requesterId: recipientId, recipientId: senderId }] },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.connection.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } }),
    prisma.block.findFirst({ where: { OR: [{ blockerId: senderId, blockedId: recipientId }, { blockerId: recipientId, blockedId: senderId }] } }),
  ]);

  const decision = canSendRequest({
    senderId,
    recipientId,
    existing: existingRequest ? { status: existingRequest.status, requesterId: existingRequest.requesterId } : null,
    alreadyConnected: Boolean(connection),
    blockedEitherWay: Boolean(block),
  });
  if (!decision.allowed) throw conflict(decision.reason!);

  const request = await prisma.connectionRequest.upsert({
    where: { requesterId_recipientId: { requesterId: senderId, recipientId } },
    create: { requesterId: senderId, recipientId, message: message || null },
    update: { status: 'PENDING', message: message || null, createdAt: new Date(), respondedAt: null },
  });

  const sender = await nameFor(senderId);
  await notify({
    userId: recipientId, actorId: senderId, type: 'CONNECTION_REQUEST',
    title: `${sender.name} would like to connect`,
    body: message?.slice(0, 160), url: '/connections', entityId: request.id,
  });
  if (recipient.notifyByEmail && recipient.notifyOnRequest) await emails.connectionRequest(recipient.email, sender.name);
  await track('connection_request_sent', senderId);

  return request;
}

export async function respondToRequest(userId: string, requestId: string, action: 'accept' | 'decline') {
  const request = await prisma.connectionRequest.findUnique({ where: { id: requestId } });
  if (!request) throw notFound('That request no longer exists.');

  const decision = canAct(action, {
    userId, requesterId: request.requesterId, recipientId: request.recipientId, status: request.status,
  });
  if (!decision.allowed) throw badRequest(decision.reason!);

  if (action === 'decline') {
    await prisma.connectionRequest.update({ where: { id: requestId }, data: { status: 'DECLINED', respondedAt: new Date() } });
    return { connected: false };
  }

  const [a, b] = orderPair(request.requesterId, request.recipientId);

  const result = await prisma.$transaction(async (tx) => {
    await tx.connectionRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED', respondedAt: new Date() } });

    const conversation = await tx.conversation.create({
      data: {
        participants: { create: [{ userId: request.requesterId }, { userId: request.recipientId }] },
      },
    });

    return tx.connection.create({
      data: { userAId: a, userBId: b, requestId, conversationId: conversation.id },
    });
  });

  const accepter = await nameFor(userId);
  const requester = await prisma.user.findUnique({ where: { id: request.requesterId }, select: { email: true, notifyByEmail: true, notifyOnRequest: true } });

  await notify({
    userId: request.requesterId, actorId: userId, type: 'CONNECTION_ACCEPTED',
    title: `${accepter.name} accepted your request`,
    body: 'You can message each other now.', url: '/messages', entityId: result.id,
  });
  if (requester?.notifyByEmail && requester.notifyOnRequest) await emails.connectionAccepted(requester.email, accepter.name);
  await track('connection_accepted', userId);

  return { connected: true, conversationId: result.conversationId };
}

export async function withdrawRequest(userId: string, requestId: string) {
  const request = await prisma.connectionRequest.findUnique({ where: { id: requestId } });
  if (!request) throw notFound('That request no longer exists.');
  const decision = canAct('withdraw', { userId, requesterId: request.requesterId, recipientId: request.recipientId, status: request.status });
  if (!decision.allowed) throw badRequest(decision.reason!);
  return prisma.connectionRequest.update({ where: { id: requestId }, data: { status: 'WITHDRAWN', respondedAt: new Date() } });
}

export async function removeConnection(userId: string, otherId: string) {
  const [a, b] = orderPair(userId, otherId);
  const connection = await prisma.connection.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  if (!connection) throw notFound('You are not connected.');

  await prisma.$transaction([
    prisma.connection.delete({ where: { id: connection.id } }),
    prisma.connectionRequest.updateMany({
      where: { OR: [{ requesterId: userId, recipientId: otherId }, { requesterId: otherId, recipientId: userId }] },
      data: { status: 'WITHDRAWN' },
    }),
  ]);
  return { removed: true };
}

export async function blockUser(userId: string, targetId: string, reason?: string) {
  if (userId === targetId) throw badRequest('You cannot block yourself.');
  const [a, b] = orderPair(userId, targetId);

  await prisma.$transaction(async (tx) => {
    await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      create: { blockerId: userId, blockedId: targetId, reason: reason ?? null },
      update: { reason: reason ?? null },
    });
    await tx.connection.deleteMany({ where: { userAId: a, userBId: b } });
    await tx.connectionRequest.updateMany({
      where: { OR: [{ requesterId: userId, recipientId: targetId }, { requesterId: targetId, recipientId: userId }] },
      data: { status: 'BLOCKED' },
    });
    await tx.recommendation.deleteMany({
      where: { OR: [{ ownerId: userId, subjectId: targetId }, { ownerId: targetId, subjectId: userId }] },
    });
  });
  return { blocked: true };
}

export async function unblockUser(userId: string, targetId: string) {
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
  return { blocked: false };
}

export async function listConnections(userId: string) {
  const [connections, incoming, outgoing] = await Promise.all([
    prisma.connection.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        userA: { include: { profile: { include: { investor: { include: { organization: true } } } } } },
        userB: { include: { profile: { include: { investor: { include: { organization: true } } } } } },
      },
    }),
    prisma.connectionRequest.findMany({
      where: { recipientId: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { requester: { include: { profile: true } } },
    }),
    prisma.connectionRequest.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { recipient: { include: { profile: true } } },
    }),
  ]);

  return {
    connections: connections.map((c) => {
      const other = c.userAId === userId ? c.userB : c.userA;
      return {
        connectionId: c.id,
        conversationId: c.conversationId,
        since: c.createdAt,
        user: other,
        profile: other.profile,
      };
    }),
    incoming,
    outgoing,
  };
}

export async function connectionStateWith(userId: string, otherId: string) {
  if (userId === otherId) return { state: 'self' as const };
  const [a, b] = orderPair(userId, otherId);
  const [connection, request, block] = await Promise.all([
    prisma.connection.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } }),
    prisma.connectionRequest.findFirst({
      where: { OR: [{ requesterId: userId, recipientId: otherId }, { requesterId: otherId, recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.block.findFirst({ where: { blockerId: userId, blockedId: otherId } }),
  ]);

  if (block) return { state: 'blocked' as const };
  if (connection) return { state: 'connected' as const, conversationId: connection.conversationId };
  if (request?.status === 'PENDING') {
    return request.requesterId === userId
      ? { state: 'pending_outgoing' as const, requestId: request.id }
      : { state: 'pending_incoming' as const, requestId: request.id };
  }
  return { state: 'none' as const };
}
