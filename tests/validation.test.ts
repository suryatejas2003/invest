import { describe, it, expect } from 'vitest';
import {
  signupSchema, passwordSchema, loginSchema, startupSchema, preferenceSchema,
  messageSchema, reportSchema, discoverQuerySchema, emailSchema,
} from '@/lib/validation/schemas';

const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const uuid2 = '3f2504e0-4f89-41d3-9a0c-0305e82c3302';

describe('email', () => {
  it('normalises case and whitespace', () => {
    expect(emailSchema.parse('  Amara@Demo.App ')).toBe('amara@demo.app');
  });
  it('rejects malformed addresses', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

describe('password rules', () => {
  it('accepts a password that meets every rule', () => {
    expect(passwordSchema.safeParse('OpenDoors2026!').success).toBe(true);
  });
  it('rejects one that is too short', () => {
    expect(passwordSchema.safeParse('Short1!').success).toBe(false);
  });
  it('rejects single-case passwords', () => {
    expect(passwordSchema.safeParse('alllowercase1').success).toBe(false);
  });
  it('rejects letters alone', () => {
    expect(passwordSchema.safeParse('OnlyLettersHere').success).toBe(false);
  });
  it('rejects a password that starts with the product name', () => {
    expect(passwordSchema.safeParse('DoorkeyPass1!').success).toBe(false);
  });
});

describe('signup', () => {
  it('accepts a valid signup', () => {
    const result = signupSchema.safeParse({
      email: 'new@demo.app', password: 'OpenDoors2026!', displayName: 'Ada Lovelace', role: 'ENTREPRENEUR',
    });
    expect(result.success).toBe(true);
  });

  it('refuses an unknown role', () => {
    const result = signupSchema.safeParse({
      email: 'new@demo.app', password: 'OpenDoors2026!', displayName: 'Ada', role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('refuses a one-character name', () => {
    const result = signupSchema.safeParse({
      email: 'new@demo.app', password: 'OpenDoors2026!', displayName: 'A', role: 'INVESTOR',
    });
    expect(result.success).toBe(false);
  });
});

describe('login', () => {
  it('does not apply password strength rules when signing in', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'old' }).success).toBe(true);
  });
});

describe('startup', () => {
  const valid = {
    name: 'Ledgerline', oneLiner: 'Reconciliation for marketplaces that hold money',
    industryId: uuid, sectorIds: [uuid], geographyId: uuid,
    stage: 'SEED', businessModel: 'FINTECH_INFRA',
  };

  it('accepts a complete startup', () => {
    expect(startupSchema.safeParse(valid).success).toBe(true);
  });

  it('requires at least one sector', () => {
    expect(startupSchema.safeParse({ ...valid, sectorIds: [] }).success).toBe(false);
  });

  it('caps sectors at four', () => {
    expect(startupSchema.safeParse({ ...valid, sectorIds: [uuid, uuid2, uuid, uuid2, uuid] }).success).toBe(false);
  });

  it('requires a one-liner that fits on one line', () => {
    expect(startupSchema.safeParse({ ...valid, oneLiner: 'x'.repeat(200) }).success).toBe(false);
  });
});

describe('investment preferences', () => {
  const valid = {
    sectorIds: [uuid], industryIds: [], geographyIds: [uuid],
    stages: ['SEED'], minCheque: 100_000, maxCheque: 500_000, currency: 'GBP',
  };

  it('accepts a coherent range', () => {
    expect(preferenceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a maximum below the minimum', () => {
    const result = preferenceSchema.safeParse({ ...valid, minCheque: 500_000, maxCheque: 100_000 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('maxCheque');
  });

  it('requires at least one stage', () => {
    expect(preferenceSchema.safeParse({ ...valid, stages: [] }).success).toBe(false);
  });
});

describe('messages', () => {
  it('rejects an empty message', () => {
    expect(messageSchema.safeParse({ conversationId: uuid, body: '   ' }).success).toBe(false);
  });
  it('rejects a message over the length limit', () => {
    expect(messageSchema.safeParse({ conversationId: uuid, body: 'x'.repeat(5000) }).success).toBe(false);
  });
  it('rejects a conversation id that is not a uuid', () => {
    expect(messageSchema.safeParse({ conversationId: 'abc', body: 'hello' }).success).toBe(false);
  });
});

describe('reports', () => {
  it('requires something to be reported', () => {
    expect(reportSchema.safeParse({ category: 'SPAM' }).success).toBe(false);
  });
  it('accepts a report about a user', () => {
    expect(reportSchema.safeParse({ subjectUserId: uuid, category: 'FRAUD' }).success).toBe(true);
  });
});

describe('discovery query', () => {
  it('defaults to relevance on the first page', () => {
    const parsed = discoverQuerySchema.parse({});
    expect(parsed.sort).toBe('relevance');
    expect(parsed.page).toBe(1);
  });
  it('coerces a page number from a query string', () => {
    expect(discoverQuerySchema.parse({ page: '3' }).page).toBe(3);
  });
  it('refuses an unknown sort order', () => {
    expect(discoverQuerySchema.safeParse({ sort: 'price' }).success).toBe(false);
  });
});
