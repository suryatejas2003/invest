'use client';

import { useActionState } from 'react';
import { Button, Select, Input } from '@/components/ui';
import { setUserStatusAction, setVerificationAction, resolveReportAction, type ActionState } from '@/server/actions/admin';

const initial: ActionState = {};

export function UserStatusForm({ userId, status }: { userId: string; status: string }) {
  const [state, action, pending] = useActionState(setUserStatusAction, initial);
  const suspend = status !== 'SUSPENDED';
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={suspend ? 'SUSPENDED' : 'ACTIVE'} />
      <Button type="submit" size="sm" variant={suspend ? 'danger' : 'secondary'} disabled={pending}>
        {pending ? '…' : suspend ? 'Suspend' : 'Restore'}
      </Button>
      {state.error && <span className="text-[12px] text-alert">{state.error}</span>}
      {state.success && <span className="text-[12px] text-signal">{state.success}</span>}
    </form>
  );
}

export function VerificationForm({ userId, type, status }: { userId: string; type: string; status: string }) {
  const [state, action, pending] = useActionState(setVerificationAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="type" value={type} />
      <label className="sr-only" htmlFor={`st-${userId}-${type}`}>Verification status</label>
      <Select id={`st-${userId}-${type}`} name="status" defaultValue={status} className="w-40 py-1.5 text-[13px]">
        <option value="UNVERIFIED">Not requested</option>
        <option value="PENDING">Under review</option>
        <option value="VERIFIED">Verified</option>
        <option value="REJECTED">Rejected</option>
      </Select>
      <label className="sr-only" htmlFor={`nt-${userId}-${type}`}>Note</label>
      <Input id={`nt-${userId}-${type}`} name="note" placeholder="Note (optional)" className="w-44 py-1.5 text-[13px]" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>{pending ? '…' : 'Apply'}</Button>
      {state.error && <span className="text-[12px] text-alert">{state.error}</span>}
      {state.success && <span className="text-[12px] text-signal">{state.success}</span>}
    </form>
  );
}

export function ReportForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(resolveReportAction, initial);
  if (state.success) return <p className="text-[13px] text-signal">{state.success}</p>;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="reportId" value={reportId} />
      <label className="sr-only" htmlFor={`note-${reportId}`}>Resolution note</label>
      <Input id={`note-${reportId}`} name="note" placeholder="What did you do?" className="w-56 py-1.5 text-[13px]" />
      <Button type="submit" name="status" value="RESOLVED" size="sm" disabled={pending}>Resolve</Button>
      <Button type="submit" name="status" value="DISMISSED" size="sm" variant="secondary" disabled={pending}>Dismiss</Button>
      {state.error && <span className="text-[12px] text-alert">{state.error}</span>}
    </form>
  );
}
