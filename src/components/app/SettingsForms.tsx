'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input, Textarea, Select, Alert } from '@/components/ui';
import {
  saveBasicsAction, savePrivacyAction, saveNotificationPrefsAction,
  changePasswordAction, deleteAccountAction, type ActionState,
} from '@/server/actions/profile';
import { AIAssist } from './AIAssist';

const initial: ActionState = {};

export function ProfileSettingsForm({ data, geographies }: {
  data: { displayName: string; headline: string | null; bio: string | null; geographyId: string | null; linkedinUrl: string | null; websiteUrl: string | null };
  geographies: Array<{ id: string; name: string; region: string }>;
}) {
  const [state, action, pending] = useActionState(saveBasicsAction, initial);
  const [bio, setBio] = useState(data.bio ?? '');
  return (
    <form action={action} className="grid gap-4 max-w-xl">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Your name" htmlFor="displayName" error={state.fieldErrors?.displayName} required>
        <Input id="displayName" name="displayName" defaultValue={data.displayName} required />
      </Field>
      <Field label="Headline" htmlFor="headline" error={state.fieldErrors?.headline}>
        <Input id="headline" name="headline" defaultValue={data.headline ?? ''} maxLength={120} />
      </Field>
      <Field label="Short bio" htmlFor="bio" error={state.fieldErrors?.bio}>
        <Textarea id="bio" name="bio" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1200} />
      </Field>
      <AIAssist
        label="Draft this with the writing assistant"
        hint="Paste rough notes and it will tidy them into a bio. It only uses facts you give it, and nothing is saved until you press Use this."
        request={{ feature: 'profile', kind: 'bio' }}
        onAccept={setBio}
      />
      <Field label="Location" htmlFor="geographyId" error={state.fieldErrors?.geographyId}>
        <Select id="geographyId" name="geographyId" defaultValue={data.geographyId ?? ''}>
          <option value="">Choose a location</option>
          {geographies.filter((g) => g.name !== 'Anywhere').map((g) => <option key={g.id} value={g.id}>{g.name} — {g.region}</option>)}
        </Select>
      </Field>
      <Field label="Profile photo" htmlFor="photo" hint="JPEG, PNG or WebP, up to 4 MB.">
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-[13.5px] file:mr-3 file:px-3 file:py-2 file:rounded-[6px] file:border file:border-line-strong file:bg-paper-raised file:text-[13px]" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="LinkedIn" htmlFor="linkedinUrl" error={state.fieldErrors?.linkedinUrl}>
          <Input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={data.linkedinUrl ?? ''} placeholder="https://" />
        </Field>
        <Field label="Website" htmlFor="websiteUrl" error={state.fieldErrors?.websiteUrl}>
          <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={data.websiteUrl ?? ''} placeholder="https://" />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="w-fit">{pending ? 'Saving…' : 'Save changes'}</Button>
    </form>
  );
}

export function PrivacyForm({ visibility, showEmail }: { visibility: string; showEmail: boolean }) {
  const [state, action, pending] = useActionState(savePrivacyAction, initial);
  const options = [
    { value: 'PUBLIC', label: 'Public', body: 'Anyone can find and read your profile, including people who are not signed in.' },
    { value: 'CONNECTION_ONLY', label: 'Connections only', body: 'Others see your name and headline. The rest opens once you accept a request.' },
    { value: 'PRIVATE', label: 'Hidden', body: 'Your profile does not appear in discovery and cannot be opened by anyone else.' },
  ];

  return (
    <form action={action} className="grid gap-5 max-w-xl">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <fieldset className="grid gap-2">
        <legend className="text-[13px] font-medium mb-1">Who can see your profile</legend>
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" name="visibility" value={o.value} defaultChecked={visibility === o.value} className="peer sr-only" />
            <span className="block border border-line-strong rounded-[8px] p-3.5 peer-checked:border-ink peer-checked:bg-brass-soft/40 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
              <span className="block text-[14.5px]">{o.label}</span>
              <span className="block text-[13px] text-muted mt-1 leading-snug">{o.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex items-start gap-2.5 text-[13.5px] cursor-pointer">
        <input type="checkbox" name="showEmail" defaultChecked={showEmail} className="w-4 h-4 mt-0.5 accent-[var(--color-ink)]" />
        <span>Show my email address to people I am connected with</span>
      </label>
      <Button type="submit" disabled={pending} className="w-fit">{pending ? 'Saving…' : 'Save privacy settings'}</Button>
    </form>
  );
}

export function NotificationsForm({ prefs }: { prefs: { notifyByEmail: boolean; notifyOnMessage: boolean; notifyOnRequest: boolean; notifyOnMatch: boolean } }) {
  const [state, action, pending] = useActionState(saveNotificationPrefsAction, initial);
  const rows = [
    ['notifyByEmail', 'Send me email as well as in-app notifications'],
    ['notifyOnRequest', 'Connection and introduction requests'],
    ['notifyOnMessage', 'New messages'],
    ['notifyOnMatch', 'New people who match what I am looking for'],
  ] as const;

  return (
    <form action={action} className="grid gap-4 max-w-xl">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-2.5">
        {rows.map(([name, label]) => (
          <label key={name} className="flex items-start gap-2.5 text-[14px] cursor-pointer border border-line rounded-[8px] px-3.5 py-3">
            <input type="checkbox" name={name} defaultChecked={prefs[name]} className="w-4 h-4 mt-0.5 accent-[var(--color-ink)]" />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <Button type="submit" disabled={pending} className="w-fit">{pending ? 'Saving…' : 'Save notification settings'}</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="grid gap-4 max-w-md">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Current password" htmlFor="currentPassword" error={state.fieldErrors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="newPassword" hint="At least 10 characters, mixed case, with a number or symbol." error={state.fieldErrors?.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" disabled={pending} className="w-fit">{pending ? 'Saving…' : 'Change password'}</Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);
  return (
    <form action={action} className="grid gap-3 max-w-md">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <p className="text-[13.5px] text-muted leading-relaxed">
        Deleting hides your profile, ends every session and removes you from discovery. Messages you
        already sent stay with the people who received them.
      </p>
      <Field label="Type delete to confirm" htmlFor="confirm">
        <Input id="confirm" name="confirm" autoComplete="off" placeholder="delete" required />
      </Field>
      <Button type="submit" variant="danger" disabled={pending} className="w-fit">
        {pending ? 'Deleting…' : 'Delete my account'}
      </Button>
    </form>
  );
}
