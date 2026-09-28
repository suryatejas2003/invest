import 'server-only';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/services/audit';
import { notify } from '@/lib/services/notifications';
import type { ReportStatus, UserStatus, VerificationStatus, VerificationType } from '@prisma/client';

export async function adminOverview() {
  const [users, entrepreneurs, investors, startups, connections, messages, openReports, pendingVerifications, recentSignups] =
    await Promise.all([
      prisma.user.count({ where: { status: { not: 'DELETED' } } }),
      prisma.user.count({ where: { role: 'ENTREPRENEUR', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'INVESTOR', status: 'ACTIVE' } }),
      prisma.startup.count(),
      prisma.connection.count(),
      prisma.message.count(),
      prisma.report.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
      prisma.verification.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { createdAt: { gt: new Date(Date.now() - 7 * 864e5) } } }),
    ]);

  const topEvents = await prisma.analyticsEvent.groupBy({
    by: ['name'],
    _count: { name: true },
    orderBy: { _count: { name: 'desc' } },
    take: 8,
  });

  return { users, entrepreneurs, investors, startups, connections, messages, openReports, pendingVerifications, recentSignups, topEvents };
}

export async function adminListUsers(q: string | undefined, page = 1, pageSize = 20) {
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { profile: { displayName: { contains: q, mode: 'insensitive' as const } } },
        ],
      }
    : {};
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { profile: true, verifications: true, _count: { select: { reportsAbout: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function adminSetUserStatus(adminId: string, userId: string, status: UserStatus, reason?: string) {
  const user = await prisma.user.update({ where: { id: userId }, data: { status } });
  if (status === 'SUSPENDED') await prisma.session.deleteMany({ where: { userId } });
  await audit({ actorId: adminId, action: `user.${status.toLowerCase()}`, entityType: 'User', entityId: userId, metadata: { reason } });
  await notify({
    userId, type: 'ACCOUNT_NOTICE',
    title: status === 'SUSPENDED' ? 'Your account has been suspended' : 'Your account has been restored',
    body: reason ?? undefined,
  });
  return user;
}

export async function adminSetVerification(
  adminId: string,
  userId: string,
  type: VerificationType,
  status: VerificationStatus,
  note?: string,
) {
  const record = await prisma.verification.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, status, note: note ?? null, reviewedById: adminId, reviewedAt: new Date() },
    update: { status, note: note ?? null, reviewedById: adminId, reviewedAt: new Date() },
  });
  await audit({ actorId: adminId, action: 'verification.set', entityType: 'Verification', entityId: record.id, metadata: { type, status } });
  await notify({
    userId, type: 'VERIFICATION_UPDATE',
    title: status === 'VERIFIED' ? 'A verification was approved' : 'A verification was updated',
    body: note ?? undefined, url: '/settings/profile',
  });
  return record;
}

export async function adminListReports(status: ReportStatus | 'ALL' = 'OPEN') {
  return prisma.report.findMany({
    where: status === 'ALL' ? {} : { status },
    include: {
      reporter: { include: { profile: true } },
      subjectUser: { include: { profile: true } },
      subjectStartup: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function adminResolveReport(adminId: string, reportId: string, status: ReportStatus, note?: string) {
  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status, resolutionNote: note ?? null, handledById: adminId },
  });
  await audit({ actorId: adminId, action: 'report.resolve', entityType: 'Report', entityId: reportId, metadata: { status } });
  return report;
}

export async function adminAuditLog(take = 100) {
  return prisma.auditLog.findMany({
    include: { actor: { include: { profile: { select: { displayName: true } } } } },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export async function adminVocabulary() {
  const [industries, geographies] = await Promise.all([
    prisma.industry.findMany({ include: { sectors: { orderBy: { name: 'asc' } }, _count: { select: { startups: true } } }, orderBy: { name: 'asc' } }),
    prisma.geography.findMany({ orderBy: [{ region: 'asc' }, { name: 'asc' }], include: { _count: { select: { startups: true, profiles: true } } } }),
  ]);
  return { industries, geographies };
}
