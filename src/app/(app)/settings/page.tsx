import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { ProfileSettingsForm } from '@/components/app/SettingsForms';

export const metadata: Metadata = { title: 'Profile settings' };
export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const [profile, geographies] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.geography.findMany({ orderBy: [{ region: 'asc' }, { name: 'asc' }] }),
  ]);
  if (!profile) return null;

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-[19px]">Your profile</h2>
        <p className="mt-1.5 text-[14px] text-muted">
          This is what other people see.{' '}
          <Link href={`/p/${profile.slug}`} className="underline underline-offset-2">View your public profile</Link>
        </p>
      </div>
      <ProfileSettingsForm
        data={{
          displayName: profile.displayName, headline: profile.headline, bio: profile.bio,
          geographyId: profile.geographyId, linkedinUrl: profile.linkedinUrl, websiteUrl: profile.websiteUrl,
        }}
        geographies={geographies}
      />
      <p className="text-[13.5px] text-muted border-t border-line pt-5">
        {user.role === 'INVESTOR'
          ? 'Your thesis, cheque range and sectors live in onboarding. '
          : 'Your startup, funding and traction live in onboarding. '}
        <Link href="/onboarding" className="underline underline-offset-2">Reopen that flow</Link> to change them.
      </p>
    </section>
  );
}
