'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui';
import { logoutAction } from '@/server/actions/auth';

export interface NavUser { displayName: string; photoUrl: string | null; slug: string | null; role: string }

const mainLinks = [
  { href: '/dashboard', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/connections', label: 'Connections' },
  { href: '/messages', label: 'Messages' },
  { href: '/saved', label: 'Saved' },
];

function Count({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brass text-[11px] text-ink font-medium">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export function AppNav({ user, unreadMessages, unreadNotifications }: { user: NavUser; unreadMessages: number; unreadNotifications: number }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user.role === 'ADMIN';

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/93 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Logo href="/dashboard" />
            <nav className="hidden md:flex items-center gap-6" aria-label="Main">
              {mainLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active(l.href) ? 'page' : undefined}
                  className={clsx(
                    'text-[14px] py-1 border-b-2 -mb-[2px] transition-colors',
                    active(l.href) ? 'border-brass text-ink' : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  {l.label}
                  {l.href === '/messages' && <Count n={unreadMessages} />}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" className={clsx('text-[14px] py-1', active('/admin') ? 'text-ink' : 'text-muted hover:text-ink')}>
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <Link href="/notifications" className="relative p-2 rounded-[6px] hover:bg-brass-soft/50" aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <path d="M18 8a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.3 20a2 2 0 003.4 0" strokeLinecap="round" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brass" aria-hidden />
              )}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 p-1 rounded-full hover:bg-brass-soft/50"
              >
                <span className="sr-only">Account menu</span>
                <Avatar name={user.displayName} src={user.photoUrl} size={30} />
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 bg-paper-raised border border-line rounded-[8px] py-1.5 shadow-[0_8px_24px_rgba(17,26,34,.08)]">
                  <p className="px-3.5 py-2 text-[13px] text-muted border-b border-line mb-1 truncate">{user.displayName}</p>
                  {user.slug && (
                    <Link role="menuitem" href={`/p/${user.slug}`} onClick={() => setMenuOpen(false)} className="block px-3.5 py-2 text-[14px] hover:bg-brass-soft/40">
                      View your profile
                    </Link>
                  )}
                  <Link role="menuitem" href="/settings" onClick={() => setMenuOpen(false)} className="block px-3.5 py-2 text-[14px] hover:bg-brass-soft/40">
                    Settings
                  </Link>
                  <form action={logoutAction}>
                    <button role="menuitem" type="submit" className="w-full text-left px-3.5 py-2 text-[14px] hover:bg-brass-soft/40">
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation: a real bottom bar, not a shrunken desktop menu. */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper-raised border-t border-line grid grid-cols-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {mainLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active(l.href) ? 'page' : undefined}
            className={clsx('py-2.5 text-center text-[11.5px] leading-tight', active(l.href) ? 'text-ink' : 'text-muted')}
          >
            <span className={clsx('block mx-auto mb-1 w-5 h-[3px] rounded-full', active(l.href) ? 'bg-brass' : 'bg-transparent')} />
            {l.label}
            {l.href === '/messages' && unreadMessages > 0 && <Count n={unreadMessages} />}
          </Link>
        ))}
      </nav>
    </>
  );
}
