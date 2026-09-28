import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { AppNav } from '@/components/app/AppNav';
import { totalUnread } from '@/server/messages';
import { unreadCount } from '@/lib/services/notifications';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.onboardingCompletedAt) redirect('/onboarding');

  const [messages, notifications] = await Promise.all([totalUnread(user.id), unreadCount(user.id)]);

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <AppNav
        user={{ displayName: user.displayName, photoUrl: user.photoUrl, slug: user.slug, role: user.role }}
        unreadMessages={messages}
        unreadNotifications={notifications}
      />
      <main id="main" className="mx-auto max-w-6xl px-5 py-8 md:py-10">{children}</main>
    </div>
  );
}
