import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, passwordProblems } from '@/lib/auth/password';
import { createToken, hashToken, safeEqual } from '@/lib/auth/tokens';

describe('password hashing', () => {
  it('never stores the password itself', async () => {
    const hash = await hashPassword('OpenDoors2026!');
    expect(hash).not.toContain('OpenDoors2026!');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('OpenDoors2026!');
    expect(await verifyPassword('OpenDoors2026!', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('OpenDoors2026!');
    expect(await verifyPassword('OpenDoors2027!', hash)).toBe(false);
  });

  it('produces a different hash each time', async () => {
    const [a, b] = await Promise.all([hashPassword('OpenDoors2026!'), hashPassword('OpenDoors2026!')]);
    expect(a).not.toBe(b);
  });

  it('returns false rather than throwing when an account has no password', async () => {
    expect(await verifyPassword('anything', null)).toBe(false);
  });

  it('describes what is wrong with a weak password', () => {
    expect(passwordProblems('short')).toContain('Use at least 10 characters');
    expect(passwordProblems('password12345')).toContain('Too easy to guess');
    expect(passwordProblems('doorkey12345A')).toContain('Too easy to guess');
    expect(passwordProblems('OpenDoors2026!')).toHaveLength(0);
  });
});

describe('opaque tokens', () => {
  it('returns a token and stores only its hash', () => {
    const { token, hash } = createToken();
    expect(token).not.toBe(hash);
    expect(hash).toHaveLength(64);
    expect(hashToken(token)).toBe(hash);
  });

  it('produces a different token every call', () => {
    expect(createToken().token).not.toBe(createToken().token);
  });

  it('compares without leaking length mismatches as a throw', () => {
    const { token, hash } = createToken();
    expect(safeEqual(hashToken(token), hash)).toBe(true);
    expect(safeEqual('short', hash)).toBe(false);
  });
});
