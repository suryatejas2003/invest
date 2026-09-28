'use client';

import { useActionState, useRef, useEffect } from 'react';
import { Button, Alert } from '@/components/ui';
import { sendMessageAction, type ActionState } from '@/server/actions/network';

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(sendMessageAction, {} as ActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <div className="grid gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <form ref={formRef} action={action} className="flex items-end gap-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <label htmlFor="body" className="sr-only">Your message</label>
        <textarea
          id="body" name="body" rows={2} required maxLength={4000}
          placeholder="Write a message"
          className="flex-1 bg-paper-raised border border-line-strong rounded-[6px] px-3 py-2.5 text-[14px] resize-y min-h-[46px] focus:border-brass focus:outline-none"
        />
        <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? 'Sending…' : 'Send'}</Button>
      </form>
    </div>
  );
}
