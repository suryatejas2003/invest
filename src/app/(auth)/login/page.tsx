import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/AuthForms';
import { getSessionUser } from '@/lib/auth/session';
import { googleEnabled } from '@/lib/auth/google';
import { Spinner } from '@/components/ui';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/dashboard');
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
