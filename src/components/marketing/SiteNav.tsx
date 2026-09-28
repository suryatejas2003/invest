'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ButtonLink } from '@/components/ui';

const links = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#for-founders', label: 'For entrepreneurs' },
  { href: '#for-investors', label: 'For investors' },
];

export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-paper/92 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-4">
        <Logo />

        <nav className="hidden md:flex items-center gap-7" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[14px] text-ink-soft hover:text-ink">{l.label}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {signedIn ? (
            <ButtonLink href="/dashboard" size="sm">Go to Doorkey</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="quiet" size="sm">Sign in</ButtonLink>
              <ButtonLink href="/signup" size="sm">Get started</ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden p-2 -mr-2"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="site-menu" className="md:hidden border-t border-line bg-paper-raised px-5 py-4 grid gap-1">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-[15px] text-ink-soft">
              {l.label}
            </a>
          ))}
          <div className="grid gap-2 pt-3 border-t border-line mt-2">
            {signedIn ? (
              <ButtonLink href="/dashboard">Go to Doorkey</ButtonLink>
            ) : (
              <>
                <Link href="/login" className="py-2.5 text-[15px] text-ink-soft">Sign in</Link>
                <ButtonLink href="/signup">Get started</ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
