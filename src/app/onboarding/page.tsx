import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { stepsFor, vocabulary } from '@/server/onboarding';
import { Onboarding, type OnboardingData } from '@/components/app/Onboarding';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = { title: 'Set up your profile' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.onboardingCompletedAt) redirect('/dashboard');

  const [profile, vocab] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: user.id },
      include: {
        entrepreneur: true,
        investor: { include: { organization: true, preference: { include: { sectors: true, geographies: true } } } },
        founderOf: { include: { startup: { include: { sectors: true } } } },
      },
    }),
    vocabulary(),
  ]);

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { onboardingStep: true, role: true } });
  const startup = profile?.founderOf[0]?.startup ?? null;

  const data: OnboardingData = {
    role: record?.role ?? 'ENTREPRENEUR',
    step: record?.onboardingStep ?? 0,
    displayName: profile?.displayName ?? user.displayName,
    headline: profile?.headline ?? null,
    bio: profile?.bio ?? null,
    geographyId: profile?.geographyId ?? null,
    linkedinUrl: profile?.linkedinUrl ?? null,
    websiteUrl: profile?.websiteUrl ?? null,
    startup: startup
      ? {
          name: startup.name, oneLiner: startup.oneLiner, description: startup.description,
          industryId: startup.industryId, sectorIds: startup.sectors.map((s) => s.id),
          geographyId: startup.geographyId, stage: startup.stage, businessModel: startup.businessModel,
          foundedYear: startup.foundedYear, teamSize: startup.teamSize, websiteUrl: startup.websiteUrl,
          amountRaised: startup.amountRaised, amountSeeking: startup.amountSeeking,
          currency: startup.currency, previousFunding: startup.previousFunding,
          revenueAnnual: startup.revenueAnnual, userCount: startup.userCount, customerCount: startup.customerCount,
          growthNote: startup.growthNote, tractionNote: startup.tractionNote,
        }
      : null,
    goals: profile?.entrepreneur?.goals ?? [],
    investor: profile?.investor
      ? {
          investorType: profile.investor.investorType,
          organizationName: profile.investor.organization?.name ?? null,
          thesis: profile.investor.thesis,
          expertise: profile.investor.expertise,
          sectorIds: profile.investor.preference?.sectors.map((s) => s.id) ?? [],
          geographyIds: profile.investor.preference?.geographies.map((g) => g.id) ?? [],
          stages: profile.investor.preference?.stages ?? [],
          minCheque: profile.investor.preference?.minCheque ?? null,
          maxCheque: profile.investor.preference?.maxCheque ?? null,
          currency: profile.investor.preference?.currency ?? 'GBP',
        }
      : null,
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto max-w-2xl px-5 h-16 flex items-center"><Logo /></div>
      </header>
      <main id="main" className="mx-auto max-w-2xl px-5 py-10 md:py-14">
        <Onboarding data={data} vocab={vocab} steps={stepsFor(data.role)} />
      </main>
    </div>
  );
}
