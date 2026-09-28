import 'server-only';
import { prisma } from '@/lib/db';
import { badRequest } from '@/lib/errors';
import { track } from '@/lib/services/analytics';

export async function toggleSaved(ownerId: string, subjectId: string, note?: string) {
  if (ownerId === subjectId) throw badRequest('You cannot save your own profile.');
  const existing = await prisma.savedProfile.findUnique({ where: { ownerId_subjectId: { ownerId, subjectId } } });

  if (existing) {
    await prisma.savedProfile.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await prisma.savedProfile.create({ data: { ownerId, subjectId, note: note ?? null } });
  await track('profile_saved', ownerId);
  return { saved: true };
}

export async function listSaved(ownerId: string) {
  return prisma.savedProfile.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      subject: {
        include: {
          profile: {
            include: {
              geography: true,
              investor: { include: { organization: true, preference: { include: { sectors: true } } } },
              founderOf: { include: { startup: { include: { industry: true, sectors: true, geography: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function savedIds(ownerId: string): Promise<Set<string>> {
  const rows = await prisma.savedProfile.findMany({ where: { ownerId }, select: { subjectId: true } });
  return new Set(rows.map((r) => r.subjectId));
}
