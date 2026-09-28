import type { Metadata } from 'next';
import { adminAuditLog } from '@/server/admin';
import { EmptyState } from '@/components/ui';

export const metadata: Metadata = { title: 'Admin · Audit log' };
export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const entries = await adminAuditLog(150);

  return (
    <div className="grid gap-4">
      <p className="text-[13.5px] text-muted">The most recent 150 recorded actions, newest first.</p>
      {entries.length === 0 ? (
        <EmptyState title="Nothing recorded yet" body="Sign-ins, moderation decisions and verification changes are written here." />
      ) : (
        <div className="overflow-x-auto border border-line rounded-[8px]">
          <table className="w-full text-[13px]">
            <caption className="sr-only">Audit log entries</caption>
            <thead className="bg-paper-raised border-b border-line">
              <tr>
                <th scope="col" className="text-left font-medium px-3 py-2.5">When</th>
                <th scope="col" className="text-left font-medium px-3 py-2.5">Who</th>
                <th scope="col" className="text-left font-medium px-3 py-2.5">Action</th>
                <th scope="col" className="text-left font-medium px-3 py-2.5">Target</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 text-muted whitespace-nowrap">
                    <time dateTime={e.createdAt.toISOString()}>{e.createdAt.toLocaleString('en-GB')}</time>
                  </td>
                  <td className="px-3 py-2">{e.actor?.profile?.displayName ?? 'system'}</td>
                  <td className="px-3 py-2 text-ink-soft">{e.action}</td>
                  <td className="px-3 py-2 text-muted">{e.entityType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
