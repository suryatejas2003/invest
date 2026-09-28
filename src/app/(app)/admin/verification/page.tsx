import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, Chip, EmptyState } from '@/components/ui';
import { VerificationForm } from '@/components/app/AdminForms';
import { VERIFICATION_LABEL } from '@/lib/config/vocab';
import { timeAgo } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Admin · Verification' };
export const dynamic = 'force-dynamic';

export default async function AdminVerificationPage() {
  const pending = await prisma.verification.findMany({
    where: { status: { in: ['PENDING', 'REJECTED'] } },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  return (
    <div className="grid gap-5">
      <p className="text-[13.5px] text-muted max-w-[60ch] leading-relaxed">
        A badge only appears on a profile once it is set to verified here. Nothing is marked verified
        automatically except email confirmation, which the member does themselves.
      </p>

      {pending.length === 0 ? (
        <EmptyState title="Nothing waiting for review" body="Requests appear here when a member asks for identity, organisation or profile verification." />
      ) : (
        <ul className="grid gap-2">
          {pending.map((v) => (
            <Card as="li" key={v.id} className="p-4 grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[14.5px] flex-1 min-w-0">
                  {v.user.profile?.slug
                    ? <Link href={`/p/${v.user.profile.slug}`} className="hover:text-brass">{v.user.profile.displayName}</Link>
                    : v.user.email}
                  <span className="text-muted"> · {VERIFICATION_LABEL[v.type]}</span>
                </p>
                <Chip tone={v.status === 'REJECTED' ? 'alert' : 'brass'}>{v.status.toLowerCase()}</Chip>
                <span className="text-[12px] text-muted">asked {timeAgo(v.createdAt)}</span>
              </div>
              {v.evidenceUrl && (
                <a href={v.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[13px] underline underline-offset-2 w-fit">
                  Evidence provided
                </a>
              )}
              <VerificationForm userId={v.userId} type={v.type} status={v.status} />
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
