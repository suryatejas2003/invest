import { prisma } from '@/lib/db';
import type { NotificationType } from '@prisma/client';

export async function notify(args: {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
  entityId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: args.userId,
      actorId: args.actorId ?? null,
      type: args.type,
      title: args.title,
      body: args.body ?? null,
      url: args.url ?? null,
      entityId: args.entityId ?? null,
    },
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
