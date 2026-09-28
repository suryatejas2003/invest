import type { Metadata } from 'next';
import { adminOverview } from '@/server/admin';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: 'Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const stats = await adminOverview();

  const cards = [
    ['Members', stats.users], ['Entrepreneurs', stats.entrepreneurs], ['Investors', stats.investors],
    ['Startups', stats.startups], ['Connections', stats.connections], ['Messages', stats.messages],
    ['Open reports', stats.openReports], ['Awaiting verification', stats.pendingVerifications],
    ['Joined this week', stats.recentSignups],
  ] as const;

  return (
    <div className="grid gap-8">
      <ul className="grid gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card as="li" key={label} className="p-4">
            <p className="text-[12.5px] text-muted">{label}</p>
            <p className="text-[26px] mt-1" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
          </Card>
        ))}
      </ul>

      <section className="grid gap-3">
        <h2 className="text-[17px]">Most recorded events</h2>
        {stats.topEvents.length === 0 ? (
          <p className="text-[14px] text-muted">No events recorded yet.</p>
        ) : (
          <ul className="grid gap-1.5 max-w-md">
            {stats.topEvents.map((e) => (
              <li key={e.name} className="flex justify-between text-[14px] border-b border-line pb-1.5">
                <span className="text-ink-soft">{e.name.replace(/_/g, ' ')}</span>
                <span className="text-muted">{e._count.name}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[12.5px] text-muted max-w-[60ch] leading-relaxed">
          Analytics record an event name and an allow-listed set of properties. Message contents,
          free text and IP addresses are never stored here.
        </p>
      </section>
    </div>
  );
}
