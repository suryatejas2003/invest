import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Logo />
        <main id="main" className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <p className="text-[12.5px] text-muted">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <span className="mx-2 text-line-strong">·</span>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
        </p>
      </div>

      <aside className="hidden lg:flex bg-ink text-paper items-center px-14">
        <div className="max-w-md">
          <p className="text-[26px] leading-snug text-paper" style={{ fontFamily: 'var(--font-display)' }}>
            The introduction is the easy part. Knowing who is worth introducing is the work.
          </p>
          <p className="mt-6 text-[14.5px] text-paper/60 leading-relaxed">
            Doorkey scores every possible pairing against what both sides have actually said they
            want, and shows you the reasons before you spend a minute on it.
          </p>
        </div>
      </aside>
    </div>
  );
}
