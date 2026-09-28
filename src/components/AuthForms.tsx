'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Field, Input, Alert } from '@/components/ui';
import {
  signupAction, loginAction, forgotPasswordAction, resetPasswordAction, type FormState,
} from '@/server/actions/auth';

const initial: FormState = {};

function Submit({ children, pending }: { children: React.ReactNode; pending: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? 'Working…' : children}
    </Button>
  );
}

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const roleParam = params.get('role') === 'investor' ? 'INVESTOR' : 'ENTREPRENEUR';
  const [state, action, pending] = useActionState(signupAction, initial);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[28px]">Create your Doorkey profile</h1>
        <p className="mt-2 text-[14px] text-muted leading-relaxed">
          Two minutes now, and Doorkey can tell you who is worth your time.
        </p>
      </div>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <form action={action} className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-medium mb-1.5">I am</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'ENTREPRENEUR', label: 'Building a company' },
              { value: 'INVESTOR', label: 'Investing in companies' },
            ].map((o) => (
              <label key={o.value} className="cursor-pointer">
                <input
                  type="radio" name="role" value={o.value} defaultChecked={roleParam === o.value}
                  className="peer sr-only" required
                />
                <span className="block border border-line-strong rounded-[6px] px-3 py-3 text-[13.5px] leading-snug peer-checked:border-ink peer-checked:bg-brass-soft/40 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
                  {o.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Your name" htmlFor="displayName" error={state.fieldErrors?.displayName} required>
          <Input id="displayName" name="displayName" autoComplete="name" required />
        </Field>

        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field
          label="Password" htmlFor="password" required
          hint="At least 10 characters, mixed case, with a number or symbol."
          error={state.fieldErrors?.password}
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>

        <Submit pending={pending}>Create profile</Submit>
      </form>

      {googleEnabled && (
        <>
          <p className="text-center text-[12.5px] text-muted">or</p>
          <a
            href="/api/auth/google"
            className="inline-flex items-center justify-center gap-2 w-full border border-line-strong rounded-[6px] px-4 py-3 text-[14px] hover:border-ink"
          >
            Continue with Google
          </a>
        </>
      )}

      <p className="text-[13.5px] text-muted">
        Already have an account? <Link href="/login" className="text-ink underline underline-offset-2">Sign in</Link>
      </p>
      <p className="text-[12px] text-muted leading-relaxed">
        By creating a profile you agree to our <Link href="/terms" className="underline">terms</Link> and{' '}
        <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
    </div>
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[28px]">Sign in</h1>
        <p className="mt-2 text-[14px] text-muted">Welcome back.</p>
      </div>

      {params.get('reset') && <Alert tone="success">Password changed. Sign in with your new password.</Alert>}
      {params.get('verified') && <Alert tone="success">Email confirmed.</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <form action={action} className="grid gap-4">
        <input type="hidden" name="next" value={params.get('next') ?? ''} />
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Submit pending={pending}>Sign in</Submit>
      </form>

      {googleEnabled && (
        <a href="/api/auth/google" className="inline-flex items-center justify-center gap-2 w-full border border-line-strong rounded-[6px] px-4 py-3 text-[14px] hover:border-ink">
          Continue with Google
        </a>
      )}

      <div className="grid gap-2 text-[13.5px] text-muted">
        <Link href="/forgot-password" className="text-ink underline underline-offset-2 w-fit">Forgot your password?</Link>
        <p>No account yet? <Link href="/signup" className="text-ink underline underline-offset-2">Create one</Link></p>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[28px]">Reset your password</h1>
        <p className="mt-2 text-[14px] text-muted leading-relaxed">
          Enter your email and we will send you a link to choose a new password.
        </p>
      </div>

      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      {!state.success && (
        <form action={action} className="grid gap-4">
          <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Submit pending={pending}>Send reset link</Submit>
        </form>
      )}

      <Link href="/login" className="text-[13.5px] text-ink underline underline-offset-2 w-fit">Back to sign in</Link>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  if (!token) {
    return (
      <div className="grid gap-5">
        <h1 className="text-[28px]">That link is incomplete</h1>
        <Alert tone="error">The reset link is missing its token. Ask for a new one.</Alert>
        <Link href="/forgot-password" className="text-[13.5px] text-ink underline underline-offset-2 w-fit">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-[28px]">Choose a new password</h1>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <form action={action} className="grid gap-4">
        <input type="hidden" name="token" value={token} />
        <Field
          label="New password" htmlFor="password"
          hint="At least 10 characters, mixed case, with a number or symbol."
          error={state.fieldErrors?.password}
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Submit pending={pending}>Save new password</Submit>
      </form>
    </div>
  );
}
