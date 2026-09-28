import 'server-only';
import { prisma } from '@/lib/db';
import { badRequest } from '@/lib/errors';
import { enforce } from '@/lib/auth/rate-limit';
import { audit } from '@/lib/services/audit';
import type { ReportCategory } from '@prisma/client';

export async function fileReport(reporterId: string, input: {
  subjectUserId?: string;
  subjectStartupId?: string;
  category: ReportCategory;
  details?: string;
}) {
  await enforce('report', reporterId);
  if (input.subjectUserId === reporterId) throw badRequest('You cannot report yourself.');

  const report = await prisma.report.create({
    data: {
      reporterId,
      subjectUserId: input.subjectUserId ?? null,
      subjectStartupId: input.subjectStartupId ?? null,
      category: input.category,
      details: input.details ?? null,
    },
  });
  await audit({ actorId: reporterId, action: 'report.create', entityType: 'Report', entityId: report.id, metadata: { category: input.category } });
  return report;
}
