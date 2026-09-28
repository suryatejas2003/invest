'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validation/schemas';
import { registerUser, authenticate, startPasswordReset, completePasswordReset } from '@/server/auth';
import { destroySession } from '@/lib/auth/session';
import { enforce } from '@/lib/auth/rate-limit';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { toPublicError } from '@/lib/errors';

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
}

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? '_');
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertSameOrigin();
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await enforce('signup');
    await registerUser(parsed.data);
  } catch (err) {
    return { error: toPublicError(err).message };
  }
  redirect('/onboarding');
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertSameOrigin();
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await enforce('login', parsed.data.email);
    await authenticate(parsed.data.email, parsed.data.password);
  } catch (err) {
    return { error: toPublicError(err).message };
  }

  const next = String(formData.get('next') ?? '');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
}

export async function logoutAction() {
  await destroySession();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertSameOrigin();
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await enforce('passwordReset', parsed.data.email);
    await startPasswordReset(parsed.data.email);
  } catch (err) {
    return { error: toPublicError(err).message };
  }
  // Deliberately the same response whether or not the account exists.
  return { success: 'If that address has a Doorkey account, a reset link is on its way. It expires in an hour.' };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertSameOrigin();
  const parsed = resetPasswordSchema.safeParse({ token: formData.get('token'), password: formData.get('password') });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await completePasswordReset(parsed.data.token, parsed.data.password);
  } catch (err) {
    return { error: toPublicError(err).message };
  }
  redirect('/login?reset=1');
}
