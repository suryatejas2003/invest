'use client';

import { useState } from 'react';
import { Button, Textarea, Alert, Spinner } from '@/components/ui';

/** What the caller supplies; `rough`/`context` are filled in from the textarea. */
export type AssistRequest =
  | { feature: 'profile'; kind: 'bio' | 'startup_description' | 'one_liner' | 'thesis' }
  | { feature: 'introduction'; recipientId: string }
  | { feature: 'summary'; subjectUserId: string };

/**
 * Generated text is always shown as a draft beside the real field. It is never
 * written anywhere until the person presses Use this, and the field stays
 * editable afterwards (§21).
 */
export function AIAssist({
  label, hint, request, needsRough = true, onAccept, acceptLabel = 'Use this',
}: {
  label: string;
  hint: string;
  request: AssistRequest;
  needsRough?: boolean;
  onAccept: (text: string) => void;
  acceptLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rough, setRough] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsRough ? { ...request, rough } : { ...request, context: rough || undefined }),
      });
      const data = (await res.json()) as { draft?: string; error?: string; provider?: string };
      if (!res.ok || !data.draft) throw new Error(data.error ?? 'The assistant could not produce a draft.');
      setDraft(data.draft);
      setProvider(data.provider ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] text-muted hover:text-ink underline underline-offset-2 w-fit">
        {label}
      </button>
    );
  }

  return (
    <div className="border border-line rounded-[8px] p-3.5 grid gap-3 bg-paper">
      <div>
        <p className="text-[13.5px]">{label}</p>
        <p className="text-[12.5px] text-muted mt-1 leading-snug">{hint}</p>
      </div>

      <Textarea
        value={rough}
        onChange={(e) => setRough(e.target.value)}
        rows={3}
        maxLength={3000}
        placeholder={needsRough ? 'Paste rough notes, bullet points, anything you have' : 'Any context worth adding (optional)'}
        aria-label="Notes for the assistant"
      />

      {error && <Alert tone="error">{error}</Alert>}

      {draft && (
        <div className="grid gap-2">
          <p className="text-[12.5px] text-muted">
            Draft — generated{provider === 'local' ? ' offline from your own words' : ''}. Check it before using it.
          </p>
          <p className="text-[14px] leading-relaxed bg-paper-raised border border-line rounded-[6px] p-3 whitespace-pre-line">{draft}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={generate} disabled={pending || (needsRough && rough.trim().length < 20)}>
          {draft ? 'Try again' : 'Write a draft'}
        </Button>
        {draft && (
          <Button type="button" size="sm" onClick={() => { onAccept(draft); setOpen(false); }}>
            {acceptLabel}
          </Button>
        )}
        <Button type="button" size="sm" variant="quiet" onClick={() => { setOpen(false); setDraft(null); }}>
          Close
        </Button>
        {pending && <Spinner label="Writing" />}
      </div>
    </div>
  );
}
