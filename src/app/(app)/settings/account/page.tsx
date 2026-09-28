import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { Card, Chip, VerifiedMark } from '@/components/ui';
import { VERIFICATION_LABEL } from '@/lib/config/vocab';
import { emailConfigured } from '@/lib/services/email';

export const metadata: Metadata = { title: 'Account settings' };
export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  const user = await requireUser();
  const verifications = await prisma.verification.findMany({ where: { userId: user.id } });

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-[19px]">Account</h2>
        <p className="mt-1.5 text-[14px] text-muted">Your sign-in details and verification status.</p>
      </div>

      <Card className="p-5 grid gap-4">
        <div>
          <p className="text-[12.5px] text-muted">Email</p>
          <p className="text-[15px]">{user.email}</p>
          <p className="mt-1.5">
            {user.emailVerifiedAt
              ? <VerifiedMark label="Confirmed" />
              : <Chip tone="brass">Not confirmed yet</Chip>}
          </p>
        </div>
        <div>
          <p className="text-[12.5px] text-muted">Role</p>
          <p className="text-[15px] capitalize">{user.role.toLowerCase()}</p>
        </div>
      </Card>

      <div className="grid gap-3">
        <h3 className="text-[16px]">Verification</h3>
        <p className="text-[13.5px] text-muted leading-relaxed max-w-[60ch]">
          Email confirmation is automatic. Identity, organisation and profile reviews are done by a
          person before any badge appears, so a missing badge only means it has not been reviewed yet.
        </p>
        <ul className="grid gap-2">
          {(['EMAIL', 'IDENTITY', 'ORGANIZATION', 'INVESTOR_REVIEW', 'STARTUP_REVIEW'] as const).map((type) => {
            const record = verifications.find((v) => v.type === type);
            const status = record?.status ?? 'UNVERIFIED';
            return (
              <li key={type} className="flex items-center justify-between gap-4 border border-line rounded-[8px] px-3.5 py-3">
                <span className="text-[14px]">{VERIFICATION_LABEL[type]}</span>
                {status === 'VERIFIED' ? <VerifiedMark label="Verified" />
                  : status === 'PENDING' ? <Chip tone="brass">Under review</Chip>
                  : status === 'REJECTED' ? <Chip tone="alert">Not approved</Chip>
                  : <Chip>Not requested</Chip>}
              </li>
            );
          })}
        </ul>
      </div>

      {!emailConfigured && (
        <p className="text-[13px] text-muted border-t border-line pt-4 leading-relaxed">
          No email provider is configured, so confirmation messages are written to the
          <code className="mx-1 px-1 bg-paper border border-line rounded">.mail</code>
          folder in the project instead of being sent. Set EMAIL_PROVIDER and EMAIL_API_KEY to deliver them.
        </p>
      )}
    </section>
  );
}
