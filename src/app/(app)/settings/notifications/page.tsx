import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { NotificationsForm } from '@/components/app/SettingsForms';

export const metadata: Metadata = { title: 'Notification settings' };
export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notifyByEmail: true, notifyOnMessage: true, notifyOnRequest: true, notifyOnMatch: true },
  });
  if (!record) return null;

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-[19px]">Notifications</h2>
        <p className="mt-1.5 text-[14px] text-muted">Choose what Doorkey tells you about.</p>
      </div>
      <NotificationsForm prefs={record} />
    </section>
  );
}
