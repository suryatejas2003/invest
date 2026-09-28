import type { Metadata } from 'next';
import Link from 'next/link';
import { adminListUsers } from '@/server/admin';
import { Card, Chip, Pagination, Avatar, EmptyState } from '@/components/ui';
import { UserStatusForm } from '@/components/app/AdminForms';
import { timeAgo } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Admin · Users' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page } = await searchParams;
  const result = await adminListUsers(q, Number(page ?? 1));

  return (
    <div className="grid gap-5">
      <form method="get" className="flex gap-2 max-w-md">
        <label htmlFor="q" className="sr-only">Search members</label>
        <input
          id="q" name="q" type="search" defaultValue={q ?? ''} placeholder="Search by name or email"
          className="flex-1 bg-paper-raised border border-line-strong rounded-[6px] px-3 py-2 text-[14px] focus:border-brass focus:outline-none"
        />
        <button type="submit" className="px-4 py-2 text-[14px] bg-ink text-paper rounded-[6px]">Search</button>
      </form>

      <p className="text-[13.5px] text-muted">{result.total} member{result.total === 1 ? '' : 's'}</p>

      {result.rows.length === 0 ? (
        <EmptyState title="Nobody matches that search" body="Try a different name or email address." />
      ) : (
        <ul className="grid gap-2">
          {result.rows.map((u) => (
            <Card as="li" key={u.id} className="p-4 flex flex-wrap items-center gap-4">
              <Avatar name={u.profile?.displayName ?? u.email} src={u.profile?.photoUrl} size={38} />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px]">
                  {u.profile?.slug
                    ? <Link href={`/p/${u.profile.slug}`} className="hover:text-brass">{u.profile.displayName}</Link>
                    : (u.profile?.displayName ?? '—')}
                </p>
                <p className="text-[12.5px] text-muted truncate">{u.email} · joined {timeAgo(u.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{u.role.toLowerCase()}</Chip>
                {u.status === 'ACTIVE' ? <Chip tone="signal">active</Chip> : <Chip tone="alert">{u.status.toLowerCase()}</Chip>}
                {u._count.reportsAbout > 0 && <Chip tone="alert">{u._count.reportsAbout} reports</Chip>}
                {u.isDemo && <Chip tone="brass">demo</Chip>}
                {u.role !== 'ADMIN' && <UserStatusForm userId={u.id} status={u.status} />}
              </div>
            </Card>
          ))}
        </ul>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} baseHref={`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`} />
    </div>
  );
}
