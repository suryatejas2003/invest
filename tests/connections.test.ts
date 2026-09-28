import { describe, it, expect } from 'vitest';
import { canSendRequest, canAct, nextStatus, orderPair } from '@/lib/connections/rules';

const ctx = (over: Partial<Parameters<typeof canSendRequest>[0]> = {}) => ({
  senderId: 'a', recipientId: 'b', existing: null, alreadyConnected: false, blockedEitherWay: false, ...over,
});

describe('canonical pair ordering', () => {
  it('returns the same order whichever way round it is called', () => {
    expect(orderPair('b', 'a')).toEqual(['a', 'b']);
    expect(orderPair('a', 'b')).toEqual(['a', 'b']);
  });
});

describe('sending a connection request', () => {
  it('allows a first request', () => {
    expect(canSendRequest(ctx()).allowed).toBe(true);
  });

  it('refuses a request to yourself', () => {
    const result = canSendRequest(ctx({ recipientId: 'a' }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/yourself/i);
  });

  it('prevents a duplicate while one is pending', () => {
    const result = canSendRequest(ctx({ existing: { status: 'PENDING', requesterId: 'a' } }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/pending/i);
  });

  it('points you at their request when they asked first', () => {
    const result = canSendRequest(ctx({ existing: { status: 'PENDING', requesterId: 'b' } }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/respond to their request/i);
  });

  it('refuses when already connected', () => {
    expect(canSendRequest(ctx({ alreadyConnected: true })).allowed).toBe(false);
  });

  it('refuses when either side has blocked the other', () => {
    const result = canSendRequest(ctx({ blockedEitherWay: true }));
    expect(result.allowed).toBe(false);
    expect(result.reason).not.toMatch(/blocked you/i); // must not reveal who blocked whom
  });

  it('allows one fresh attempt after a decline or a withdrawal', () => {
    expect(canSendRequest(ctx({ existing: { status: 'DECLINED', requesterId: 'a' } })).allowed).toBe(true);
    expect(canSendRequest(ctx({ existing: { status: 'WITHDRAWN', requesterId: 'a' } })).allowed).toBe(true);
  });

  it('refuses after a block even without the blocked flag', () => {
    expect(canSendRequest(ctx({ existing: { status: 'BLOCKED', requesterId: 'b' } })).allowed).toBe(false);
  });
});

describe('acting on a request', () => {
  const base = { userId: 'b', requesterId: 'a', recipientId: 'b', status: 'PENDING' as const };

  it('lets the recipient accept or decline', () => {
    expect(canAct('accept', base).allowed).toBe(true);
    expect(canAct('decline', base).allowed).toBe(true);
  });

  it('stops the sender accepting their own request', () => {
    const result = canAct('accept', { ...base, userId: 'a' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/received the request/i);
  });

  it('stops the recipient withdrawing', () => {
    expect(canAct('withdraw', base).allowed).toBe(false);
    expect(canAct('withdraw', { ...base, userId: 'a' }).allowed).toBe(true);
  });

  it('refuses anyone who is neither party', () => {
    const result = canAct('accept', { ...base, userId: 'c' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not yours/i);
  });

  it('refuses a second response to a settled request', () => {
    expect(canAct('accept', { ...base, status: 'ACCEPTED' }).allowed).toBe(false);
    expect(canAct('decline', { ...base, status: 'DECLINED' }).allowed).toBe(false);
  });

  it('only allows removal of an accepted connection', () => {
    expect(canAct('remove', { ...base, status: 'ACCEPTED' }).allowed).toBe(true);
    expect(canAct('remove', base).allowed).toBe(false);
  });

  it('always allows blocking', () => {
    expect(canAct('block', base).allowed).toBe(true);
    expect(canAct('block', { ...base, status: 'ACCEPTED' }).allowed).toBe(true);
  });
});

describe('resulting status', () => {
  it('maps each action to its state', () => {
    expect(nextStatus('accept')).toBe('ACCEPTED');
    expect(nextStatus('decline')).toBe('DECLINED');
    expect(nextStatus('withdraw')).toBe('WITHDRAWN');
    expect(nextStatus('block')).toBe('BLOCKED');
  });
});
