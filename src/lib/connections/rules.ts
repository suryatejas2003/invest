export type ConnectionState = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'BLOCKED';
export type ConnectionAction = 'send' | 'accept' | 'decline' | 'withdraw' | 'remove' | 'block';

/** Canonical pair ordering so a pair can only ever produce one Connection row. */
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export interface RequestContext {
  senderId: string;
  recipientId: string;
  existing: { status: ConnectionState; requesterId: string } | null;
  alreadyConnected: boolean;
  blockedEitherWay: boolean;
}

export interface Decision { allowed: boolean; reason?: string }

/** Whether a new connection request may be created. */
export function canSendRequest(ctx: RequestContext): Decision {
  if (ctx.senderId === ctx.recipientId) return { allowed: false, reason: 'You cannot connect with yourself.' };
  if (ctx.blockedEitherWay) return { allowed: false, reason: 'This person is not accepting requests from you.' };
  if (ctx.alreadyConnected) return { allowed: false, reason: 'You are already connected.' };

  if (ctx.existing) {
    switch (ctx.existing.status) {
      case 'PENDING':
        return ctx.existing.requesterId === ctx.senderId
          ? { allowed: false, reason: 'Your request is still pending.' }
          : { allowed: false, reason: 'They have already asked to connect with you. Respond to their request instead.' };
      case 'ACCEPTED':
        return { allowed: false, reason: 'You are already connected.' };
      case 'BLOCKED':
        return { allowed: false, reason: 'This person is not accepting requests from you.' };
      case 'DECLINED':
      case 'WITHDRAWN':
        // A single fresh attempt is allowed after a decline or withdrawal.
        return { allowed: true };
    }
  }
  return { allowed: true };
}

/** Who may perform which transition on an existing request. */
export function canAct(
  action: Exclude<ConnectionAction, 'send'>,
  ctx: { userId: string; requesterId: string; recipientId: string; status: ConnectionState },
): Decision {
  const isRecipient = ctx.userId === ctx.recipientId;
  const isRequester = ctx.userId === ctx.requesterId;
  if (!isRecipient && !isRequester) return { allowed: false, reason: 'This request is not yours.' };

  switch (action) {
    case 'accept':
    case 'decline':
      if (!isRecipient) return { allowed: false, reason: 'Only the person who received the request can respond to it.' };
      if (ctx.status !== 'PENDING') return { allowed: false, reason: 'This request has already been dealt with.' };
      return { allowed: true };
    case 'withdraw':
      if (!isRequester) return { allowed: false, reason: 'Only the sender can withdraw a request.' };
      if (ctx.status !== 'PENDING') return { allowed: false, reason: 'This request is no longer pending.' };
      return { allowed: true };
    case 'remove':
      if (ctx.status !== 'ACCEPTED') return { allowed: false, reason: 'You are not connected.' };
      return { allowed: true };
    case 'block':
      return { allowed: true };
  }
}

export function nextStatus(action: Exclude<ConnectionAction, 'send' | 'remove'>): ConnectionState {
  return { accept: 'ACCEPTED', decline: 'DECLINED', withdraw: 'WITHDRAWN', block: 'BLOCKED' }[action] as ConnectionState;
}
