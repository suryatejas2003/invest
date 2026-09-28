import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Alert } from '@/components/ui';

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-[13.5px] text-muted hover:text-ink">Back to Doorkey</Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <h1 className="text-[clamp(1.9rem,5vw,2.6rem)]">{title}</h1>
        <p className="mt-3 text-[13.5px] text-muted">Last updated {updated}</p>

        <div className="mt-8">
          <Alert tone="info">
            This is placeholder wording written for a product in development. It is not legal advice
            and has not been reviewed by a lawyer. Replace it with a reviewed document before Doorkey
            handles real users or real data.
          </Alert>
        </div>

        <div className="mt-10 grid gap-8 text-[15px] leading-relaxed text-ink-soft [&_h2]:text-[19px] [&_h2]:text-ink [&_ul]:grid [&_ul]:gap-2 [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-3xl px-5 py-6 text-[12.5px] text-muted">
          Questions about this page: <a href="mailto:hello@doorkey.app" className="underline underline-offset-2">hello@doorkey.app</a>
        </p>
      </footer>
    </div>
  );
}
