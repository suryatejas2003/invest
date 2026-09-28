import type { Metadata } from 'next';
import Link from 'next/link';
import { adminListReports } from '@/server/admin';
import { Card, Chip, EmptyState } from '@/components/ui';
import { ReportForm } from '@/components/app/AdminForms';
import { REPORT_CATEGORY_LABEL } from '@/lib/config/vocab';
import { timeAgo } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Admin · Reports' };
export const dynamic = 'force-dynamic';

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = (status === 'ALL' || status === 'RESOLVED' || status === 'DISMISSED' ? status : 'OPEN') as 'OPEN' | 'ALL' | 'RESOLVED' | 'DISMISSED';
  const reports = await adminListReports(filter as never);

  return (
    <div className="grid gap-5">
      <nav className="flex gap-2" aria-label="Filter reports">
        {['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'].map((s) => (
          <Link key={s} href={`/admin/reports?status=${s}`} className={`text-[13px] px-2.5 py-1 rounded-full border ${filter === s ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-soft'}`}>
            {s.toLowerCase()}
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <EmptyState title="No reports here" body="Reports filed by members about profiles or companies appear in this queue." />
      ) : (
        <ul className="grid gap-2">
          {reports.map((r) => (
            <Card as="li" key={r.id} className="p-4 grid gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Chip tone="alert">{REPORT_CATEGORY_LABEL[r.category]}</Chip>
                <Chip>{r.status.toLowerCase()}</Chip>
                <span className="text-[12.5px] text-muted">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-[14px]">
                <span className="text-muted">Reported by </span>
                {r.reporter.profile?.displayName ?? 'a member'}
                <span className="text-muted"> about </span>
                {r.subjectUser?.profile?.slug
                  ? <Link href={`/p/${r.subjectUser.profile.slug}`} className="underline underline-offset-2">{r.subjectUser.profile.displayName}</Link>
                  : (r.subjectStartup?.name ?? 'a profile')}
              </p>
              {r.details && <p className="text-[13.5px] text-ink-soft leading-relaxed border-l-2 border-line pl-3">{r.details}</p>}
              {r.resolutionNote && <p className="text-[13px] text-signal">Outcome: {r.resolutionNote}</p>}
              {(r.status === 'OPEN' || r.status === 'REVIEWING') && <ReportForm reportId={r.id} />}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
