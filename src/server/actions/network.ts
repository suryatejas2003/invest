'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { toPublicError } from '@/lib/errors';
import {
  sendConnectionRequest, respondToRequest, withdrawRequest, removeConnection, blockUser, unblockUser,
} from '@/server/connections';
import { requestIntroduction, respondToIntroduction } from '@/server/introductions';
import { toggleSaved } from '@/server/saved';
import { fileReport } from '@/server/reports';
import { sendMessage } from '@/server/messages';
import { markAllRead } from '@/lib/services/notifications';
import { connectionRequestSchema, introductionSchema, messageSchema, reportSchema } from '@/lib/validation/schemas';

export interface ActionState { error?: string; success?: string }

const ok = (message: string): ActionState => ({ success: message });
const fail = (err: unknown): ActionState => ({ error: toPublicError(err).message });

export async function connectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const parsed = connectionRequestSchema.safeParse({
      recipientId: formData.get('recipientId'),
      message: formData.get('message') || undefined,
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    await sendConnectionRequest(user.id, parsed.data.recipientId, parsed.data.message);
    revalidatePath('/discover');
    revalidatePath('/connections');
    return ok('Request sent. You will hear when they respond.');
  } catch (err) { return fail(err); }
}

export async function respondRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const id = String(formData.get('requestId'));
    const action = String(formData.get('decision')) as 'accept' | 'decline';
    await respondToRequest(user.id, id, action);
    revalidatePath('/connections');
    revalidatePath('/messages');
    return ok(action === 'accept' ? 'Connected. You can message each other now.' : 'Request declined.');
  } catch (err) { return fail(err); }
}

export async function withdrawRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    await withdrawRequest(user.id, String(formData.get('requestId')));
    revalidatePath('/connections');
    return ok('Request withdrawn.');
  } catch (err) { return fail(err); }
}

export async function removeConnectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    await removeConnection(user.id, String(formData.get('userId')));
    revalidatePath('/connections');
    return ok('Connection removed.');
  } catch (err) { return fail(err); }
}

export async function blockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const targetId = String(formData.get('userId'));
    const undo = formData.get('undo') === '1';
    if (undo) { await unblockUser(user.id, targetId); return ok('Unblocked.'); }
    await blockUser(user.id, targetId, String(formData.get('reason') ?? '') || undefined);
    revalidatePath('/discover');
    revalidatePath('/connections');
    return ok('Blocked. They can no longer see you or contact you.');
  } catch (err) { return fail(err); }
}

export async function introductionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const parsed = introductionSchema.safeParse({
      targetId: formData.get('targetId'),
      message: formData.get('message') || undefined,
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    await requestIntroduction(user.id, parsed.data.targetId, parsed.data.message);
    revalidatePath('/connections');
    return ok('Introduction requested.');
  } catch (err) { return fail(err); }
}

export async function respondIntroductionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const decision = String(formData.get('decision')) as 'accept' | 'decline';
    await respondToIntroduction(user.id, String(formData.get('introId')), decision);
    revalidatePath('/connections');
    revalidatePath('/messages');
    return ok(decision === 'accept' ? 'Introduction accepted. A conversation is open.' : 'Introduction declined.');
  } catch (err) { return fail(err); }
}

export async function saveProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const result = await toggleSaved(user.id, String(formData.get('userId')));
    revalidatePath('/saved');
    revalidatePath('/discover');
    return ok(result.saved ? 'Saved to your list.' : 'Removed from your list.');
  } catch (err) { return fail(err); }
}

export async function reportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const parsed = reportSchema.safeParse({
      subjectUserId: formData.get('subjectUserId') || undefined,
      subjectStartupId: formData.get('subjectStartupId') || undefined,
      category: formData.get('category'),
      details: formData.get('details') || undefined,
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    await fileReport(user.id, parsed.data);
    return ok('Report received. Someone will review it.');
  } catch (err) { return fail(err); }
}

export async function sendMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const user = await requireUser();
    const parsed = messageSchema.safeParse({
      conversationId: formData.get('conversationId'),
      body: formData.get('body'),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    await sendMessage(user.id, parsed.data.conversationId, parsed.data.body);
    revalidatePath(`/messages/${parsed.data.conversationId}`);
    revalidatePath('/messages');
    return ok('');
  } catch (err) { return fail(err); }
}

export async function markNotificationsReadAction(): Promise<void> {
  try {
    const user = await requireUser();
    await markAllRead(user.id);
    revalidatePath('/notifications');
    revalidatePath('/', 'layout');
  } catch (err) {
    console.error('[notifications] mark read failed', toPublicError(err).code);
  }
}
