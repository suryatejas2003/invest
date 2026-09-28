import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { PrivacyForm } from '@/components/app/SettingsForms';

export const metadata: Metadata = { title: 'Privacy settings' };
export const dynamic = 'force-dynamic';

export default async function PrivacySettingsPage() {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return null;

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-[19px]">Privacy</h2>
        <p className="mt-1.5 text-[14px] text-muted">You decide how much of your profile is visible, and to whom.</p>
      </div>
      <PrivacyForm visibility={profile.visibility} showEmail={profile.showEmail} />
    </section>
  );
}
