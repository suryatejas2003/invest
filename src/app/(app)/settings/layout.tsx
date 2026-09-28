import Link from 'next/link';

const tabs = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/account', label: 'Account' },
  { href: '/settings/privacy', label: 'Privacy' },
  { href: '/settings/notifications', label: 'Notifications' },
  { href: '/settings/security', label: 'Security' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-8">
      <h1 className="text-[clamp(1.6rem,4vw,2.1rem)]">Settings</h1>
      <div className="grid gap-8 lg:grid-cols-[180px_1fr] lg:gap-12">
        <nav aria-label="Settings sections" className="flex lg:grid gap-1 overflow-x-auto pb-1 lg:pb-0">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className="text-[14px] px-3 py-2 rounded-[6px] text-ink-soft hover:bg-brass-soft/50 whitespace-nowrap">
              {t.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
