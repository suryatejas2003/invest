import Link from 'next/link';

/** The mark is a keyhole set in a doorplate — the product's one visual idea. */
export function Logo({ tone = 'ink', href = '/' }: { tone?: 'ink' | 'paper'; href?: string }) {
  const color = tone === 'paper' ? 'text-paper' : 'text-ink';
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${color}`} aria-label="Doorkey home">
      <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden fill="none">
        <rect x="0.75" y="0.75" width="20.5" height="24.5" rx="2.25" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
        <circle cx="11" cy="10" r="3.4" fill="var(--color-brass)" />
        <path d="M11 13.2L9.6 19.4h2.8L11 13.2z" fill="var(--color-brass)" />
      </svg>
      <span className="font-[var(--font-fraunces)] text-[19px] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-display)' }}>
        Doorkey
      </span>
    </Link>
  );
}
