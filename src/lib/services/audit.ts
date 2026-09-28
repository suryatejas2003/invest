import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

/** Administrative and security-relevant actions are recorded permanently. */
export async function audit(args: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  } catch { /* outside a request context */ }

  await prisma.auditLog.create({
    data: {
      actorId: args.actorId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId ?? null,
      metadata: (args.metadata ?? {}) as object,
      ip,
    },
  }).catch((err) => console.error('[audit] failed', err));
}
