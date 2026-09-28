'use client';

import { useActionState, useState } from 'react';
import { Button, Alert, Textarea, Field, Select } from '@/components/ui';
import { AIAssist } from './AIAssist';
import {
  connectAction, respondRequestAction, withdrawRequestAction, removeConnectionAction,
  blockAction, introductionAction, respondIntroductionAction, saveProfileAction,
  reportAction, type ActionState,
} from '@/server/actions/network';

const initial: ActionState = {};

/** Connect with an optional note. The note field only appears once asked for. */
export function ConnectForm({ recipientId, compact }: { recipientId: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(connectAction, initial);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <div className="grid gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <form action={action} className="grid gap-2">
        <input type="hidden" name="recipientId" value={recipientId} />
        {open && (
          <div className="grid gap-2">
            <Field label="Add a note" htmlFor={`note-${recipientId}`} hint="Say why you are getting in touch. Optional, but it helps.">
              <Textarea id={`note-${recipientId}`} name="message" rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <AIAssist
              label="Draft this with the writing assistant"
              hint="It reads both profiles and suggests an opener. Edit it before you send — nothing goes out until you press Connect."
              request={{ feature: 'introduction', recipientId }}
              needsRough={false}
              onAccept={setNote}
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" size={compact ? 'sm' : 'md'} disabled={pending} aria-busy={pending}>
            {pending ? 'Sending…' : 'Connect'}
          </Button>
          {!open && (
            <Button type="button" variant="quiet" size={compact ? 'sm' : 'md'} onClick={() => setOpen(true)}>
              Add a note
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export function RespondForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(respondRequestAction, initial);
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <div className="grid gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="requestId" value={requestId} />
        <Button type="submit" name="decision" value="accept" size="sm" disabled={pending}>Accept</Button>
        <Button type="submit" name="decision" value="decline" size="sm" variant="secondary" disabled={pending}>Decline</Button>
      </form>
    </div>
  );
}

export function WithdrawForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(withdrawRequestAction, initial);
  if (state.success) return <p className="text-[13px] text-muted">{state.success}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" variant="quiet" size="sm" disabled={pending}>Withdraw</Button>
      {state.error && <p className="text-[12.5px] text-alert mt-1">{state.error}</p>}
    </form>
  );
}

export function SaveToggle({ userId, saved }: { userId: string; saved: boolean }) {
  const [state, action, pending] = useActionState(saveProfileAction, initial);
  const label = state.success ? (state.success.includes('Removed') ? 'Save' : 'Saved') : saved ? 'Saved' : 'Save';
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending} aria-pressed={label === 'Saved'}>
        {pending ? '…' : label}
      </Button>
    </form>
  );
}

export function IntroductionForm({ targetId }: { targetId: string }) {
  const [state, action, pending] = useActionState(introductionAction, initial);
  const [open, setOpen] = useState(false);

  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  if (!open) {
    return <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>Request introduction</Button>;
  }

  return (
    <form action={action} className="grid gap-2 border border-line rounded-[8px] p-3.5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="targetId" value={targetId} />
      <Field label="Why would this be worth their time?" htmlFor={`intro-${targetId}`}>
        <Textarea id={`intro-${targetId}`} name="message" rows={3} maxLength={600} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? 'Sending…' : 'Send request'}</Button>
        <Button type="button" variant="quiet" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

export function RespondIntroductionForm({ introId }: { introId: string }) {
  const [state, action, pending] = useActionState(respondIntroductionAction, initial);
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="introId" value={introId} />
      <Button type="submit" name="decision" value="accept" size="sm" disabled={pending}>Accept</Button>
      <Button type="submit" name="decision" value="decline" size="sm" variant="secondary" disabled={pending}>Decline</Button>
      {state.error && <p className="text-[12.5px] text-alert">{state.error}</p>}
    </form>
  );
}

export function RemoveConnectionForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(removeConnectionAction, initial);
  if (state.success) return <p className="text-[13px] text-muted">{state.success}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="quiet" size="sm" disabled={pending}>Remove connection</Button>
      {state.error && <p className="text-[12.5px] text-alert mt-1">{state.error}</p>}
    </form>
  );
}

/** Block and report live together: both are ways to say "stop". */
export function SafetyPanel({ userId, startupId, blocked }: { userId: string; startupId?: string; blocked: boolean }) {
  const [blockState, blockFn, blockPending] = useActionState(blockAction, initial);
  const [reportState, reportFn, reportPending] = useActionState(reportAction, initial);
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-line pt-4 mt-4 grid gap-3">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-[13px] text-muted hover:text-ink w-fit underline underline-offset-2">
          Report or block this profile
        </button>
      ) : (
        <>
          {reportState.success && <Alert tone="success">{reportState.success}</Alert>}
          {reportState.error && <Alert tone="error">{reportState.error}</Alert>}

          {!reportState.success && (
            <form action={reportFn} className="grid gap-2.5">
              <input type="hidden" name="subjectUserId" value={userId} />
              {startupId && <input type="hidden" name="subjectStartupId" value={startupId} />}
              <Field label="What is the problem?" htmlFor={`cat-${userId}`}>
                <Select id={`cat-${userId}`} name="category" defaultValue="SPAM">
                  <option value="SPAM">Spam</option>
                  <option value="FRAUD">Fraud</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="MISREPRESENTATION">Misrepresentation</option>
                  <option value="OTHER">Something else</option>
                </Select>
              </Field>
              <Field label="Anything else we should know?" htmlFor={`det-${userId}`}>
                <Textarea id={`det-${userId}`} name="details" rows={3} maxLength={1500} />
              </Field>
              <Button type="submit" variant="secondary" size="sm" disabled={reportPending}>
                {reportPending ? 'Sending…' : 'Send report'}
              </Button>
            </form>
          )}

          {blockState.success ? (
            <Alert tone="success">{blockState.success}</Alert>
          ) : (
            <form action={blockFn} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={userId} />
              {blocked && <input type="hidden" name="undo" value="1" />}
              <Button type="submit" variant="danger" size="sm" disabled={blockPending}>
                {blocked ? 'Unblock' : 'Block this person'}
              </Button>
              <span className="text-[12.5px] text-muted">Blocking removes any connection and hides you from each other.</span>
            </form>
          )}
          {blockState.error && <Alert tone="error">{blockState.error}</Alert>}
        </>
      )}
    </div>
  );
}
