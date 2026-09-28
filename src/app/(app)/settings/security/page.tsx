import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { PasswordForm, DeleteAccountForm } from '@/components/app/SettingsForms';
import { Button } from '@/components/ui';
import { logoutAction } from '@/server/actions/auth';
import { timeAgo } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Security settings' };
export const dynamic = 'force-dynamic';

export default async function SecuritySettingsPage() {
  const user = await requireUser();
  const sessions = await prisma.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } });
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, lastLoginAt: true } });

  return (
    <section className="grid gap-8">
      <div>
        <h2 className="text-[19px]">Security</h2>
        <p className="mt-1.5 text-[14px] text-muted">
          {sessions} active session{sessions === 1 ? '' : 's'}
          {record?.lastLoginAt && ` · last signed in ${timeAgo(record.lastLoginAt)}`}
        </p>
      </div>

      {record?.passwordHash ? (
        <div className="grid gap-3">
          <h3 className="text-[16px]">Change password</h3>
          <PasswordForm />
        </div>
      ) : (
        <p className="text-[14px] text-muted">
          You sign in with Google, so there is no password on this account.
        </p>
      )}

      <div className="grid gap-3 border-t border-line pt-6">
        <h3 className="text-[16px]">Sign out</h3>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" className="w-fit">Sign out of this device</Button>
        </form>
      </div>

      <div className="grid gap-3 border-t border-line pt-6">
        <h3 className="text-[16px] text-alert">Delete account</h3>
        <DeleteAccountForm />
      </div>
    </section>
  );
}
