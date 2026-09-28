import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignupForm } from '@/components/AuthForms';
import { getSessionUser } from '@/lib/auth/session';
import { googleEnabled } from '@/lib/auth/google';
import { Spinner } from '@/components/ui';

export const metadata: Metadata = { title: 'Create your profile' };

export default async function SignupPage() {
  if (await getSessionUser()) redirect('/dashboard');
  return (
    <Suspense fallback={<Spinner />}>
      <SignupForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
