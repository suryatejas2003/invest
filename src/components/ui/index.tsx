import * as React from 'react';
import Link from 'next/link';
import clsx from 'clsx';

/* ---------------------------------------------------------------- button */

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[6px]';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-soft',
  secondary: 'bg-paper-raised text-ink border border-line-strong hover:border-ink',
  quiet: 'text-ink-soft hover:text-ink hover:bg-brass-soft/60',
  danger: 'bg-paper-raised text-alert border border-alert/30 hover:bg-alert-soft',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'text-[13px] px-3 py-1.5',
  md: 'text-[14px] px-4 py-2.5',
  lg: 'text-[15px] px-5 py-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={clsx(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={clsx(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />;
}

/* ----------------------------------------------------------------- forms */

export function Field({
  label, htmlFor, hint, error, children, required,
}: {
  label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
        {required && <span className="text-muted"> (required)</span>}
      </label>
      {hint && <p id={hintId} className="text-[12.5px] text-muted leading-snug">{hint}</p>}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
            'aria-invalid': error ? true : undefined,
          })
        : children}
      {error && <p id={errorId} role="alert" className="text-[12.5px] text-alert">{error}</p>}
    </div>
  );
}

const controlClass =
  'w-full bg-paper-raised border border-line-strong rounded-[6px] px-3 py-2.5 text-[14px] text-ink placeholder:text-muted/70 focus:border-brass focus:outline-none';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={clsx(controlClass, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={clsx(controlClass, 'min-h-28 leading-relaxed', className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return <select ref={ref} className={clsx(controlClass, 'appearance-none pr-8', className)} {...props}>{children}</select>;
  },
);

/* ------------------------------------------------------------- structure */

export function Card({ className, children, as: Tag = 'div' }: { className?: string; children: React.ReactNode; as?: 'div' | 'article' | 'li' }) {
  return <Tag className={clsx('bg-paper-raised border border-line rounded-[10px]', className)}>{children}</Tag>;
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="rounded-full object-cover border border-line" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full bg-brass-soft text-brass font-medium border border-brass/20"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {letters}
    </span>
  );
}

export function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'signal' | 'brass' | 'alert' }) {
  const tones = {
    neutral: 'bg-paper border-line-strong text-ink-soft',
    signal: 'bg-signal-soft border-signal/20 text-signal',
    brass: 'bg-brass-soft border-brass/25 text-brass',
    alert: 'bg-alert-soft border-alert/25 text-alert',
  };
  return <span className={clsx('inline-block border rounded-full px-2.5 py-1 text-[12px] leading-none whitespace-nowrap', tones[tone])}>{children}</span>;
}

export function VerifiedMark({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-signal" title={label}>
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden fill="none">
        <path d="M8 1.5l1.9 1.2 2.2-.2.6 2.1 1.6 1.5-1.1 1.9.3 2.2-2.1.7-1.4 1.7L8 11.8l-2 .8-1.4-1.7-2.1-.7.3-2.2L1.7 6.1l1.6-1.5.6-2.1 2.2.2L8 1.5z" fill="currentColor" opacity=".18"/>
        <path d="M5.4 8.2l1.8 1.8 3.4-3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong rounded-[10px] p-8 text-center">
      <h3 className="text-[17px] mb-1.5">{title}</h3>
      <p className="text-[14px] text-muted max-w-sm mx-auto leading-relaxed">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  const tones = {
    info: 'bg-brass-soft/50 border-brass/25 text-ink',
    error: 'bg-alert-soft border-alert/25 text-alert',
    success: 'bg-signal-soft border-signal/25 text-signal',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('border rounded-[6px] px-3.5 py-2.5 text-[13.5px] leading-relaxed', tones[tone])}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-[13px] text-muted">
      <svg width="15" height="15" viewBox="0 0 16 16" className="animate-spin" aria-hidden>
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity=".2" fill="none" />
        <path d="M14.5 8a6.5 6.5 0 00-6.5-6.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

/** Reasons a pairing is relevant. The numeric score is never shown. */
export function MatchReasons({ reasons, band }: { reasons: string[]; band?: 'strong' | 'relevant' | 'possible' }) {
  if (!reasons.length) return null;
  return (
    <div className="threshold">
      <p className="text-[12.5px] text-muted mb-1.5">
        {band === 'strong' ? 'Why this is a strong fit' : 'Why this may be relevant'}
      </p>
      <ul className="grid gap-1">
        {reasons.map((r) => (
          <li key={r} className="flex gap-2 text-[13.5px] text-ink-soft leading-snug">
            <svg width="14" height="14" viewBox="0 0 16 16" className="mt-[3px] shrink-0 text-signal" aria-hidden fill="none">
              <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pagination({ page, pageCount, baseHref }: { page: number; pageCount: number; baseHref: string }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => `${baseHref}${baseHref.includes('?') ? '&' : '?'}page=${p}`;
  return (
    <nav className="flex items-center justify-between gap-4 pt-2" aria-label="Pages">
      {page > 1 ? (
        <ButtonLink href={href(page - 1)} variant="secondary" size="sm">Previous</ButtonLink>
      ) : <span />}
      <p className="text-[13px] text-muted">Page {page} of {pageCount}</p>
      {page < pageCount ? (
        <ButtonLink href={href(page + 1)} variant="secondary" size="sm">Next</ButtonLink>
      ) : <span />}
    </nav>
  );
}

export function DemoTag() {
  return <Chip tone="brass">Demo account</Chip>;
}
