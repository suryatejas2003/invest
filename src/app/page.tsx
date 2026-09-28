import Link from 'next/link';
import { SiteNav } from '@/components/marketing/SiteNav';
import { HeroMatch, type HeroPair } from '@/components/marketing/HeroMatch';
import { ButtonLink, Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { getSessionUser } from '@/lib/auth/session';
import { scoreMatch, scoreMatchForInvestor } from '@/lib/matching/score';
import type { MatchInvestorInput, MatchStartupInput } from '@/lib/matching/types';

export const dynamic = 'force-dynamic';

/* The hero runs the real scorer over two illustrative pairings. Nothing here
   is hand-written copy pretending to be output — the reason lines below are
   produced by src/lib/matching/score.ts at request time. */

const climateFounder: MatchStartupInput = {
  sectorCodes: ['ENERGY', 'CIRCULAR'],
  industryCode: 'CLIMATE',
  stage: 'SEED',
  geographyCode: 'UK_LONDON',
  geographyRegion: 'UK & Ireland',
  amountSeeking: 1_200_000,
  currency: 'GBP',
  businessModel: 'HARDWARE',
  keywords: 'grid storage retrofit for commercial buildings, energy efficiency, hardware',
  founderGoals: ['FUNDING', 'MENTORSHIP'],
};

const sampleInvestors: Array<{ name: string; subtitle: string; meta: string; input: MatchInvestorInput }> = [
  {
    name: 'Priya Raghavan',
    subtitle: 'Partner, Fernwood Capital',
    meta: 'Seed and Series A · £250k–£2m',
    input: {
      sectorCodes: ['ENERGY', 'MOBILITY'], industryCodes: ['CLIMATE'],
      stages: ['SEED', 'SERIES_A'], geographyCodes: ['UK_LONDON', 'EU_BERLIN'],
      geographyRegions: ['UK & Ireland', 'Europe'], investsAnywhere: false,
      minCheque: 250_000, maxCheque: 2_000_000, currency: 'GBP', investorType: 'VENTURE_CAPITAL',
      keywords: 'energy hardware, grid storage, industrial efficiency, commercial buildings',
    },
  },
  {
    name: 'Tomas Lindqvist',
    subtitle: 'Angel, former operator',
    meta: 'Pre-seed and seed · £25k–£150k',
    input: {
      sectorCodes: ['CIRCULAR', 'AGRI'], industryCodes: ['CLIMATE'],
      stages: ['PRE_SEED', 'SEED'], geographyCodes: ['ANY'],
      geographyRegions: ['Global'], investsAnywhere: true,
      minCheque: 25_000, maxCheque: 150_000, currency: 'GBP', investorType: 'ANGEL',
      keywords: 'circular economy, retrofit, materials reuse',
    },
  },
];

const fintechInvestor: MatchInvestorInput = {
  sectorCodes: ['PAYMENTS', 'REGTECH'], industryCodes: ['FINANCE'],
  stages: ['SEED'], geographyCodes: ['UK_LONDON', 'IE_DUBLIN'],
  geographyRegions: ['UK & Ireland'], investsAnywhere: false,
  minCheque: 200_000, maxCheque: 1_000_000, currency: 'GBP', investorType: 'MICRO_VC',
  keywords: 'payments infrastructure, compliance automation, financial regulation',
};

const sampleStartups: Array<{ name: string; subtitle: string; meta: string; input: MatchStartupInput }> = [
  {
    name: 'Ledgerline',
    subtitle: 'Amara Okonjo · Co-founder',
    meta: 'Seed · raising £800k · London',
    input: {
      sectorCodes: ['PAYMENTS'], industryCode: 'FINANCE', stage: 'SEED',
      geographyCode: 'UK_LONDON', geographyRegion: 'UK & Ireland',
      amountSeeking: 800_000, currency: 'GBP', businessModel: 'FINTECH_INFRA',
      keywords: 'reconciliation and payments infrastructure for marketplaces',
      founderGoals: ['FUNDING'],
    },
  },
  {
    name: 'Clausewise',
    subtitle: 'Daniel Mbeki · Founder',
    meta: 'Seed · raising £600k · Dublin',
    input: {
      sectorCodes: ['REGTECH'], industryCode: 'FINANCE', stage: 'SEED',
      geographyCode: 'IE_DUBLIN', geographyRegion: 'UK & Ireland',
      amountSeeking: 600_000, currency: 'GBP', businessModel: 'B2B_SAAS',
      keywords: 'compliance automation for regulated financial firms',
      founderGoals: ['FUNDING', 'MENTORSHIP'],
    },
  },
];

const sectorNames: Record<string, string> = {
  ENERGY: 'energy', CIRCULAR: 'the circular economy', MOBILITY: 'mobility',
  AGRI: 'agriculture', PAYMENTS: 'payments', REGTECH: 'regulatory technology',
};

function buildHeroPairs(): { founderView: HeroPair[]; investorView: HeroPair[] } {
  const founderView = sampleInvestors.map((i) => ({
    name: i.name,
    subtitle: i.subtitle,
    meta: i.meta,
    reasons: scoreMatch(climateFounder, i.input, { sectorNames, geographyName: 'London', stageName: 'seed' }).reasons,
  }));

  const investorView = sampleStartups.map((s) => ({
    name: s.name,
    subtitle: s.subtitle,
    meta: s.meta,
    reasons: scoreMatchForInvestor(s.input, fintechInvestor, {
      sectorNames,
      geographyName: s.input.geographyCode === 'UK_LONDON' ? 'London' : 'Dublin',
    }).reasons,
  }));

  return { founderView, investorView };
}

const steps = [
  { title: 'Say who you are', body: 'Your stage, sector, location and what you are raising — or the cheques you write and the companies you back.' },
  { title: 'See who is relevant', body: 'Doorkey ranks people against your profile and tells you, in plain words, what it matched on.' },
  { title: 'Ask to connect', body: 'Send a request with a note, or ask for an introduction. Nothing opens until the other person agrees.' },
  { title: 'Take it forward', body: 'Once a request is accepted you can message directly. The rest happens between the two of you.' },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const { founderView, investorView } = buildHeroPairs();

  return (
    <>
      <SiteNav signedIn={Boolean(user)} />

      <main id="main">
        {/* ---------------------------------------------------------- hero */}
        <section className="bg-ink text-paper">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24 grid gap-12 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-16 items-start">
            <div className="max-w-xl">
              <h1 className="text-[clamp(2.4rem,6vw,3.9rem)] leading-[1.03] text-paper">
                Open the right doors to the right people.
              </h1>
              <p className="mt-6 text-[17px] leading-relaxed text-paper/70 max-w-[52ch]">
                Doorkey is where founders and investors find the handful of people who are genuinely
                relevant to them. Every suggestion comes with the reasons behind it, so you can judge
                it before you spend anyone&rsquo;s time.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg" className="bg-brass text-ink hover:bg-brass/90 border border-brass">
                  Create your profile
                </ButtonLink>
                <ButtonLink href="#how-it-works" size="lg" variant="secondary" className="bg-transparent text-paper border-paper/25 hover:border-paper/60">
                  See how it works
                </ButtonLink>
              </div>

              <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-paper/15 pt-6 max-w-md">
                {[
                  ['Structured', 'profiles, not free text'],
                  ['Explained', 'every match, in plain words'],
                  ['Consent-first', 'nothing opens uninvited'],
                ].map(([term, detail]) => (
                  <div key={term}>
                    <dt className="text-[14px] text-paper" style={{ fontFamily: 'var(--font-display)' }}>{term}</dt>
                    <dd className="text-[12.5px] text-paper/55 leading-snug mt-0.5">{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="text-ink">
              <HeroMatch founderView={founderView} investorView={investorView} />
              <p className="mt-3 text-[12px] text-paper/45 leading-relaxed">
                Sample profiles. The reasons above are produced by the same matching code that runs
                inside the product.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- how it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-20 md:py-28 scroll-mt-20">
          <div className="max-w-2xl">
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)]">How Doorkey works</h2>
            <p className="mt-4 text-[16px] text-muted leading-relaxed">
              Four steps, in order. Most of the work happens once, when you set up your profile.
            </p>
          </div>

          <ol className="mt-12 grid gap-px bg-line md:grid-cols-4 border border-line rounded-[10px] overflow-hidden">
            {steps.map((s, i) => (
              <li key={s.title} className="bg-paper-raised p-6">
                <span className="text-[13px] text-brass" style={{ fontFamily: 'var(--font-display)' }}>Step {i + 1}</span>
                <h3 className="mt-2 text-[18px]">{s.title}</h3>
                <p className="mt-2 text-[14px] text-muted leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ----------------------------------------------- for entrepreneurs */}
        <section id="for-founders" className="border-y border-line bg-paper-raised scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-24 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-[clamp(1.7rem,3.2vw,2.3rem)]">If you are building something</h2>
              <p className="mt-4 text-[16px] text-muted leading-relaxed max-w-[54ch]">
                Raising is mostly a research problem. Doorkey does the first pass for you: it reads
                your stage, sector, location and round size, and shows you the investors whose stated
                remit actually covers you.
              </p>
              <ButtonLink href="/signup?role=entrepreneur" className="mt-7">Set up a founder profile</ButtonLink>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                ['Find investors who match your remit', 'Filter by sector, stage, geography and cheque size — then sort by how well they fit.'],
                ['Present the company properly', 'A structured startup profile: what you do, where you are, what you have, what you need.'],
                ['Ask for an introduction', 'A lighter first step than a connection request when you want to be put in front of someone.'],
                ['Look for more than money', 'Say whether you want mentorship, partners or hires, and that shapes who you are shown.'],
              ].map(([title, body]) => (
                <Card key={title} className="p-5" as="li">
                  <h3 className="text-[15.5px] leading-snug">{title}</h3>
                  <p className="mt-2 text-[13.5px] text-muted leading-relaxed">{body}</p>
                </Card>
              ))}
            </ul>
          </div>
        </section>

        {/* -------------------------------------------------- for investors */}
        <section id="for-investors" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-24 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="lg:order-2">
              <h2 className="text-[clamp(1.7rem,3.2vw,2.3rem)]">If you write cheques</h2>
              <p className="mt-4 text-[16px] text-muted leading-relaxed max-w-[54ch]">
                Deal flow is easy to get and hard to filter. Set out your thesis once — sectors,
                stages, geographies, cheque range — and Doorkey only surfaces companies that sit
                inside it, with the mismatch made obvious when there is one.
              </p>
              <ButtonLink href="/signup?role=investor" className="mt-7">Set up an investor profile</ButtonLink>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:order-1">
              {[
                ['Deal flow shaped by your thesis', 'Companies are scored against your stated remit, not against how loudly they market.'],
                ['Filter on the things that matter', 'Stage, sector, geography, round size, business model, evidence of traction.'],
                ['See the founder, not just the deck', 'Every company is attached to a real profile with a named founder behind it.'],
                ['Save and come back', 'Keep a private shortlist of companies worth a second look.'],
              ].map(([title, body]) => (
                <Card key={title} className="p-5" as="li">
                  <h3 className="text-[15.5px] leading-snug">{title}</h3>
                  <p className="mt-2 text-[13.5px] text-muted leading-relaxed">{body}</p>
                </Card>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------ trust */}
        <section className="bg-ink text-paper">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
            <div className="max-w-2xl">
              <h2 className="text-[clamp(1.7rem,3.2vw,2.3rem)] text-paper">What we do about trust</h2>
              <p className="mt-4 text-[16px] text-paper/65 leading-relaxed">
                A network like this only works if people believe what they read on it. Here is
                exactly what Doorkey checks, and what it does not.
              </p>
            </div>

            <div className="mt-12 grid gap-px bg-paper/15 md:grid-cols-4 border border-paper/15 rounded-[10px] overflow-hidden">
              {[
                ['Verification badges mean something', 'Email confirmation is automatic. Identity, organisation and profile reviews are done by a person, and a badge only appears once that review has happened.'],
                ['Profiles are structured', 'Sectors, stages and geographies come from a fixed list rather than free text, so filters behave and nobody games the wording.'],
                ['You choose who sees you', 'Every profile can be public, visible only to your connections, or hidden entirely. Your email is never shown unless you turn it on.'],
                ['Nothing opens uninvited', 'Messaging requires an accepted connection. You can withdraw, decline, remove, block and report at any point.'],
              ].map(([title, body]) => (
                <div key={title} className="bg-ink p-6">
                  <h3 className="text-[16px] text-paper leading-snug">{title}</h3>
                  <p className="mt-2.5 text-[13.5px] text-paper/60 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <ButtonLink href="/signup" size="lg" className="bg-brass text-ink hover:bg-brass/90 border border-brass">
                Create your profile
              </ButtonLink>
              <p className="text-[13.5px] text-paper/50">Free while Doorkey is in early access.</p>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 text-[13.5px] text-muted leading-relaxed max-w-[34ch]">
              Introductions between founders and investors, with the reasoning shown.
            </p>
          </div>

          {[
            { heading: 'Product', links: [['How it works', '/#how-it-works'], ['For entrepreneurs', '/#for-founders'], ['For investors', '/#for-investors'], ['Sign in', '/login']] },
            { heading: 'Company', links: [['About', '/#how-it-works'], ['Contact', 'mailto:hello@doorkey.app']] },
            { heading: 'Legal', links: [['Privacy', '/privacy'], ['Terms', '/terms']] },
          ].map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-[14px] mb-3">{group.heading}</h2>
              <ul className="grid gap-2">
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-[13.5px] text-muted hover:text-ink">{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-5 py-5 text-[12.5px] text-muted">
            © {new Date().getFullYear()} Doorkey. Profiles marked as demo accounts are fictional and exist for evaluation only.
          </p>
        </div>
      </footer>
    </>
  );
}
