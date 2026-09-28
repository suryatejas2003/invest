import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';

const tabs = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/verification', label: 'Verification' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/content', label: 'Content' },
  { href: '/admin/audit', label: 'Audit log' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="grid gap-7">
      <div>
        <h1 className="text-[clamp(1.6rem,4vw,2.1rem)]">Administration</h1>
        <p className="mt-2 text-[14px] text-muted">Every action on these pages is written to the audit log.</p>
      </div>
      <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto border-b border-line pb-2">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="text-[14px] px-3 py-1.5 rounded-[6px] text-ink-soft hover:bg-brass-soft/50 whitespace-nowrap">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
