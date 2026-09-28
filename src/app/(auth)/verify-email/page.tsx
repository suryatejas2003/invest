import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyEmailToken } from '@/server/auth';
import { Alert, ButtonLink } from '@/components/ui';
import { toPublicError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Confirm your email' };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="grid gap-5">
        <h1 className="text-[28px]">Confirm your email</h1>
        <p className="text-[14px] text-muted leading-relaxed">
          Open the link we emailed you. If it has expired you can ask for a new one from your account settings.
        </p>
        <ButtonLink href="/dashboard" variant="secondary">Go to Doorkey</ButtonLink>
      </div>
    );
  }

  try {
    await verifyEmailToken(token);
  } catch (err) {
    return (
      <div className="grid gap-5">
        <h1 className="text-[28px]">That link did not work</h1>
        <Alert tone="error">{toPublicError(err).message}</Alert>
        <Link href="/settings/account" className="text-[13.5px] text-ink underline underline-offset-2 w-fit">
          Send a new confirmation email
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-[28px]">Email confirmed</h1>
      <p className="text-[14px] text-muted leading-relaxed">
        Your email address is verified. That badge now shows on your profile.
      </p>
      <ButtonLink href="/dashboard">Go to your dashboard</ButtonLink>
    </div>
  );
}
