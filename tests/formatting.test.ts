import { describe, it, expect } from 'vitest';
import { money, chequeRange, compactNumber, initials, slugify } from '@/lib/utils/format';

describe('money', () => {
  it('writes millions the way investors say them', () => {
    expect(money(2_500_000, 'GBP')).toBe('£2.5m');
    expect(money(2_000_000, 'GBP')).toBe('£2m');
  });
  it('writes thousands compactly', () => {
    expect(money(750_000, 'GBP')).toBe('£750k');
    expect(money(25_000, 'USD')).toBe('$25k');
  });
  it('handles a missing amount without crashing', () => {
    expect(money(null)).toBe('—');
  });
  it('uses the right symbol per currency', () => {
    expect(money(1_000_000, 'EUR')).toBe('€1m');
    expect(money(1_000_000, 'INR')).toBe('₹1m');
  });
});

describe('cheque range', () => {
  it('reads as a range', () => {
    expect(chequeRange(250_000, 2_000_000, 'GBP')).toBe('£250k – £2m');
  });
});

describe('compact numbers', () => {
  it('shortens large counts', () => {
    expect(compactNumber(71_000)).toBe('71k');
    expect(compactNumber(1_400_000)).toBe('1.4m');
    expect(compactNumber(42)).toBe('42');
  });
});

describe('initials', () => {
  it('takes at most two letters', () => {
    expect(initials('Amara Okonjo')).toBe('AO');
    expect(initials('Priya Raghavan Iyer')).toBe('PR');
    expect(initials('Cher')).toBe('C');
  });
});

describe('slugify', () => {
  it('produces a url-safe slug', () => {
    expect(slugify('Calder & Finch')).toBe('calder-finch');
    expect(slugify('  Ledgerline  ')).toBe('ledgerline');
  });
});
