import { CURRENCY_SYMBOL } from '@/lib/config/vocab';

/** £2.5m, £750k, £40k — investors read rounds this way, not as 2,500,000. */
export function money(amount: number | null | undefined, currency = 'GBP'): string {
  if (amount == null) return '—';
  const symbol = CURRENCY_SYMBOL[currency] ?? '';
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${symbol}${m % 1 === 0 ? m : m.toFixed(1)}m`;
  }
  if (amount >= 1_000) return `${symbol}${Math.round(amount / 1000)}k`;
  return `${symbol}${amount}`;
}

export function chequeRange(min: number, max: number, currency = 'GBP'): string {
  return `${money(min, currency)} – ${money(max, currency)}`;
}

export function compactNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function timeAgo(date: Date | string): string {
  const then = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
