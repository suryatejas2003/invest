'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input, Textarea, Select, Alert } from '@/components/ui';
import {
  chooseRoleAction, saveBasicsAction, saveStartupAction, saveFundingAction, saveTractionAction,
  saveGoalsAction, saveInvestorAction, savePreferenceAction, finishOnboardingAction, type ActionState,
} from '@/server/actions/profile';
import { STAGE_LABEL, BUSINESS_MODEL_LABEL, INVESTOR_TYPE_LABEL, GOAL_LABEL } from '@/lib/config/vocab';

const initial: ActionState = {};

export interface VocabItem { id: string; name: string; code?: string }
export interface Vocab {
  industries: Array<{ id: string; name: string; sectors: VocabItem[] }>;
  geographies: Array<{ id: string; name: string; region: string }>;
}

export interface OnboardingData {
  role: 'ENTREPRENEUR' | 'INVESTOR' | 'ADMIN';
  step: number;
  displayName: string;
  headline: string | null;
  bio: string | null;
  geographyId: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  startup: {
    name: string; oneLiner: string; description: string | null; industryId: string;
    sectorIds: string[]; geographyId: string | null; stage: string; businessModel: string;
    foundedYear: number | null; teamSize: number | null; websiteUrl: string | null;
    amountRaised: number | null; amountSeeking: number | null; currency: string; previousFunding: string | null;
    revenueAnnual: number | null; userCount: number | null; customerCount: number | null;
    growthNote: string | null; tractionNote: string | null;
  } | null;
  goals: string[];
  investor: {
    investorType: string; organizationName: string | null; thesis: string | null; expertise: string[];
    sectorIds: string[]; geographyIds: string[]; stages: string[];
    minCheque: number | null; maxCheque: number | null; currency: string;
  } | null;
}

function Progress({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="grid gap-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] text-muted">Step {current + 1} of {steps.length}</p>
        <p className="text-[13px] text-ink">{steps[current]}</p>
      </div>
      <ol className="flex gap-1" aria-label="Progress">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === current ? 'step' : undefined}
            className={`h-1 flex-1 rounded-full ${i < current ? 'bg-brass' : i === current ? 'bg-brass/60' : 'bg-line'}`}
          >
            <span className="sr-only">{s}{i < current ? ' (done)' : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepShell({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[26px] leading-tight">{title}</h1>
        <p className="mt-2 text-[14.5px] text-muted leading-relaxed max-w-[52ch]">{blurb}</p>
      </div>
      {children}
    </div>
  );
}

function CheckList({ name, options, selected, columns = 2 }: {
  name: string; options: Array<{ value: string; label: string }>; selected: string[]; columns?: number;
}) {
  return (
    <div className={`grid gap-1.5 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 text-[13.5px] text-ink-soft cursor-pointer border border-line rounded-[6px] px-3 py-2 hover:border-line-strong">
          <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} className="w-4 h-4 accent-[var(--color-ink)]" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function useStep(action: (p: ActionState, f: FormData) => Promise<ActionState>, onDone: () => void) {
  const [state, formAction, pending] = useActionState(async (p: ActionState, f: FormData) => {
    const result = await action(p, f);
    if (result.success !== undefined && !result.error) onDone();
    return result;
  }, initial);
  return { state, formAction, pending };
}

export function Onboarding({ data, vocab, steps }: { data: OnboardingData; vocab: Vocab; steps: readonly string[] }) {
  const [role, setRole] = useState<'ENTREPRENEUR' | 'INVESTOR' | null>(
    data.role === 'ADMIN' ? null : data.step > 0 ? (data.role as 'ENTREPRENEUR' | 'INVESTOR') : null,
  );
  const [step, setStep] = useState(data.step > 0 ? data.step - 1 : -1);
  const allSectors = vocab.industries.flatMap((i) => i.sectors);

  const next = () => setStep((s) => s + 1);

  /* ------------------------------------------------------- role choice */
  const roleStep = useStep(chooseRoleAction, () => { setStep(0); });

  if (step < 0 || role === null) {
    return (
      <StepShell
        title="Which side of the table are you on?"
        blurb="This decides what Doorkey asks you next, and who it shows you. You can change it later in settings."
      >
        {roleStep.state.error && <Alert tone="error">{roleStep.state.error}</Alert>}
        <form action={roleStep.formAction} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { value: 'ENTREPRENEUR', title: 'I am building a company', body: 'You will be asked about your startup, your round and what you need.' },
              { value: 'INVESTOR', title: 'I invest in companies', body: 'You will be asked about your thesis, cheque size and the stages you back.' },
            ].map((o) => (
              <label key={o.value} className="cursor-pointer">
                <input
                  type="radio" name="role" value={o.value} required className="peer sr-only"
                  onChange={() => setRole(o.value as 'ENTREPRENEUR' | 'INVESTOR')}
                />
                <span className="block h-full border border-line-strong rounded-[8px] p-4 peer-checked:border-ink peer-checked:bg-brass-soft/40 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
                  <span className="block text-[15.5px]">{o.title}</span>
                  <span className="block text-[13px] text-muted mt-1.5 leading-snug">{o.body}</span>
                </span>
              </label>
            ))}
          </div>
          <Button type="submit" size="lg" disabled={roleStep.pending} className="w-fit">
            {roleStep.pending ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </StepShell>
    );
  }

  const isFounder = role === 'ENTREPRENEUR';

  return (
    <div className="grid gap-8">
      <Progress steps={steps} current={Math.min(step, steps.length - 1)} />
      {isFounder
        ? <FounderSteps step={step} next={next} back={() => setStep((s) => Math.max(0, s - 1))} data={data} vocab={vocab} allSectors={allSectors} />
        : <InvestorSteps step={step} next={next} back={() => setStep((s) => Math.max(0, s - 1))} data={data} vocab={vocab} allSectors={allSectors} />}
    </div>
  );
}

function Nav({ pending, back, label = 'Save and continue' }: { pending: boolean; back?: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>{pending ? 'Saving…' : label}</Button>
      {back && <Button type="button" variant="quiet" onClick={back}>Back</Button>}
    </div>
  );
}

function BasicsForm({ data, vocab, next, back }: { data: OnboardingData; vocab: Vocab; next: () => void; back?: () => void }) {
  const { state, formAction, pending } = useStep(saveBasicsAction, next);
  return (
    <StepShell title="Start with you" blurb="This is what people see first. Keep the bio short — two or three sentences is plenty.">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <form action={formAction} className="grid gap-4">
        <Field label="Your name" htmlFor="displayName" error={state.fieldErrors?.displayName} required>
          <Input id="displayName" name="displayName" defaultValue={data.displayName} required />
        </Field>
        <Field label="Headline" htmlFor="headline" hint="One line. For example: Co-founder at Ledgerline, or Partner at Fernwood Capital." error={state.fieldErrors?.headline}>
          <Input id="headline" name="headline" defaultValue={data.headline ?? ''} maxLength={120} />
        </Field>
        <Field label="Short bio" htmlFor="bio" error={state.fieldErrors?.bio}>
          <Textarea id="bio" name="bio" defaultValue={data.bio ?? ''} rows={4} maxLength={1200} />
        </Field>
        <Field label="Where are you based?" htmlFor="geographyId" error={state.fieldErrors?.geographyId}>
          <Select id="geographyId" name="geographyId" defaultValue={data.geographyId ?? ''}>
            <option value="">Choose a location</option>
            {vocab.geographies.filter((g) => g.name !== 'Anywhere').map((g) => (
              <option key={g.id} value={g.id}>{g.name} — {g.region}</option>
            ))}
          </Select>
        </Field>
        <Field label="Profile photo" htmlFor="photo" hint="JPEG, PNG or WebP, up to 4 MB. Optional.">
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-[13.5px] file:mr-3 file:px-3 file:py-2 file:rounded-[6px] file:border file:border-line-strong file:bg-paper-raised file:text-[13px]" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="LinkedIn" htmlFor="linkedinUrl" error={state.fieldErrors?.linkedinUrl}>
            <Input id="linkedinUrl" name="linkedinUrl" type="url" placeholder="https://" defaultValue={data.linkedinUrl ?? ''} />
          </Field>
          <Field label="Website" htmlFor="websiteUrl" error={state.fieldErrors?.websiteUrl}>
            <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://" defaultValue={data.websiteUrl ?? ''} />
          </Field>
        </div>
        <Nav pending={pending} back={back} />
      </form>
    </StepShell>
  );
}

function FounderSteps({ step, next, back, data, vocab, allSectors }: {
  step: number; next: () => void; back: () => void; data: OnboardingData; vocab: Vocab; allSectors: VocabItem[];
}) {
  const startup = useStep(saveStartupAction, next);
  const funding = useStep(saveFundingAction, next);
  const traction = useStep(saveTractionAction, next);
  const goals = useStep(saveGoalsAction, next);

  if (step === 0) return <BasicsForm data={data} vocab={vocab} next={next} />;

  if (step === 1) {
    return (
      <StepShell title="Tell us about the company" blurb="Sectors and stage are what matching runs on, so they matter more than the prose.">
        {startup.state.error && <Alert tone="error">{startup.state.error}</Alert>}
        <form action={startup.formAction} className="grid gap-4">
          <Field label="Startup name" htmlFor="name" error={startup.state.fieldErrors?.name} required>
            <Input id="name" name="name" defaultValue={data.startup?.name ?? ''} required />
          </Field>
          <Field label="One line on what you do" htmlFor="oneLiner" hint="Plain description, not a slogan." error={startup.state.fieldErrors?.oneLiner} required>
            <Input id="oneLiner" name="oneLiner" maxLength={160} defaultValue={data.startup?.oneLiner ?? ''} required />
          </Field>
          <Field label="Description" htmlFor="description" error={startup.state.fieldErrors?.description}>
            <Textarea id="description" name="description" rows={5} defaultValue={data.startup?.description ?? ''} />
          </Field>
          <Field label="Logo" htmlFor="logo" hint="JPEG, PNG or WebP, up to 4 MB. Optional.">
            <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="text-[13.5px] file:mr-3 file:px-3 file:py-2 file:rounded-[6px] file:border file:border-line-strong file:bg-paper-raised file:text-[13px]" />
          </Field>

          <Field label="Industry" htmlFor="industryId" error={startup.state.fieldErrors?.industryId} required>
            <Select id="industryId" name="industryId" defaultValue={data.startup?.industryId ?? ''} required>
              <option value="">Choose an industry</option>
              {vocab.industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>

          <fieldset>
            <legend className="text-[13px] font-medium mb-2">Sectors <span className="text-muted">(up to four)</span></legend>
            {startup.state.fieldErrors?.sectorIds && <p className="text-[12.5px] text-alert mb-2">{startup.state.fieldErrors.sectorIds}</p>}
            <CheckList name="sectorIds" options={allSectors.map((s) => ({ value: s.id, label: s.name }))} selected={data.startup?.sectorIds ?? []} />
          </fieldset>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Stage" htmlFor="stage" error={startup.state.fieldErrors?.stage} required>
              <Select id="stage" name="stage" defaultValue={data.startup?.stage ?? 'PRE_SEED'} required>
                {Object.entries(STAGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Business model" htmlFor="businessModel" error={startup.state.fieldErrors?.businessModel} required>
              <Select id="businessModel" name="businessModel" defaultValue={data.startup?.businessModel ?? 'B2B_SAAS'} required>
                {Object.entries(BUSINESS_MODEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Where is the company based?" htmlFor="startupGeo" error={startup.state.fieldErrors?.geographyId} required>
            <Select id="startupGeo" name="geographyId" defaultValue={data.startup?.geographyId ?? data.geographyId ?? ''} required>
              <option value="">Choose a location</option>
              {vocab.geographies.filter((g) => g.name !== 'Anywhere').map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Founded" htmlFor="foundedYear" error={startup.state.fieldErrors?.foundedYear}>
              <Input id="foundedYear" name="foundedYear" type="number" min={1990} max={new Date().getFullYear()} defaultValue={data.startup?.foundedYear ?? ''} />
            </Field>
            <Field label="Team size" htmlFor="teamSize" error={startup.state.fieldErrors?.teamSize}>
              <Input id="teamSize" name="teamSize" type="number" min={1} defaultValue={data.startup?.teamSize ?? ''} />
            </Field>
            <Field label="Website" htmlFor="startupSite" error={startup.state.fieldErrors?.websiteUrl}>
              <Input id="startupSite" name="websiteUrl" type="url" placeholder="https://" defaultValue={data.startup?.websiteUrl ?? ''} />
            </Field>
          </div>

          <Nav pending={startup.pending} back={back} />
        </form>
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell title="What are you raising?" blurb="Round size is matched against each investor's cheque range, so an honest number gets better results than an ambitious one.">
        {funding.state.error && <Alert tone="error">{funding.state.error}</Alert>}
        <form action={funding.formAction} className="grid gap-4">
          <Field label="Currency" htmlFor="currency">
            <Select id="currency" name="currency" defaultValue={data.startup?.currency ?? 'GBP'}>
              {['GBP', 'USD', 'EUR', 'INR', 'SGD'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Amount you are seeking" htmlFor="amountSeeking" hint="Whole units, no separators." error={funding.state.fieldErrors?.amountSeeking}>
              <Input id="amountSeeking" name="amountSeeking" type="number" min={0} step={10000} defaultValue={data.startup?.amountSeeking ?? ''} />
            </Field>
            <Field label="Raised so far" htmlFor="amountRaised" error={funding.state.fieldErrors?.amountRaised}>
              <Input id="amountRaised" name="amountRaised" type="number" min={0} step={10000} defaultValue={data.startup?.amountRaised ?? ''} />
            </Field>
          </div>
          <Field label="Previous rounds" htmlFor="previousFunding" hint="For example: pre-seed of £300k in 2024, angels only." error={funding.state.fieldErrors?.previousFunding}>
            <Input id="previousFunding" name="previousFunding" defaultValue={data.startup?.previousFunding ?? ''} />
          </Field>
          <Nav pending={funding.pending} back={back} />
        </form>
      </StepShell>
    );
  }

  if (step === 3) {
    return (
      <StepShell title="Any traction so far?" blurb="All optional. Investors filter on evidence, so include what you have and leave the rest blank.">
        {traction.state.error && <Alert tone="error">{traction.state.error}</Alert>}
        <form action={traction.formAction} className="grid gap-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Annual revenue" htmlFor="revenueAnnual" error={traction.state.fieldErrors?.revenueAnnual}>
              <Input id="revenueAnnual" name="revenueAnnual" type="number" min={0} defaultValue={data.startup?.revenueAnnual ?? ''} />
            </Field>
            <Field label="Users" htmlFor="userCount" error={traction.state.fieldErrors?.userCount}>
              <Input id="userCount" name="userCount" type="number" min={0} defaultValue={data.startup?.userCount ?? ''} />
            </Field>
            <Field label="Customers" htmlFor="customerCount" error={traction.state.fieldErrors?.customerCount}>
              <Input id="customerCount" name="customerCount" type="number" min={0} defaultValue={data.startup?.customerCount ?? ''} />
            </Field>
          </div>
          <Field label="Growth" htmlFor="growthNote" hint="For example: 18% month on month since March." error={traction.state.fieldErrors?.growthNote}>
            <Input id="growthNote" name="growthNote" defaultValue={data.startup?.growthNote ?? ''} />
          </Field>
          <Field label="Anything else worth knowing" htmlFor="tractionNote" error={traction.state.fieldErrors?.tractionNote}>
            <Textarea id="tractionNote" name="tractionNote" rows={3} defaultValue={data.startup?.tractionNote ?? ''} />
          </Field>
          <Nav pending={traction.pending} back={back} />
        </form>
      </StepShell>
    );
  }

  return (
    <StepShell title="What do you actually need?" blurb="Doorkey uses this to decide who is worth showing you. Most founders pick two or three.">
      {goals.state.error && <Alert tone="error">{goals.state.error}</Alert>}
      <form action={goals.formAction} className="grid gap-4">
        <CheckList name="goals" options={Object.entries(GOAL_LABEL).map(([v, l]) => ({ value: v, label: l }))} selected={data.goals} />
        <Nav pending={goals.pending} back={back} label="Save" />
      </form>
      <form action={finishOnboardingAction}>
        <Button type="submit" variant="secondary" size="lg">Finish and see my matches</Button>
      </form>
    </StepShell>
  );
}

function InvestorSteps({ step, next, back, data, vocab, allSectors }: {
  step: number; next: () => void; back: () => void; data: OnboardingData; vocab: Vocab; allSectors: VocabItem[];
}) {
  const investor = useStep(saveInvestorAction, next);
  const preference = useStep(savePreferenceAction, next);

  if (step === 0) return <BasicsForm data={data} vocab={vocab} next={next} />;

  if (step === 1) {
    return (
      <StepShell title="How do you invest?" blurb="Your thesis is compared against what founders write, so specifics help more than generalities.">
        {investor.state.error && <Alert tone="error">{investor.state.error}</Alert>}
        <form action={investor.formAction} className="grid gap-4">
          <Field label="Investor type" htmlFor="investorType" error={investor.state.fieldErrors?.investorType} required>
            <Select id="investorType" name="investorType" defaultValue={data.investor?.investorType ?? 'ANGEL'} required>
              {Object.entries(INVESTOR_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Fund or organisation" htmlFor="organizationName" hint="Leave blank if you invest as an individual." error={investor.state.fieldErrors?.organizationName}>
            <Input id="organizationName" name="organizationName" defaultValue={data.investor?.organizationName ?? ''} />
          </Field>
          <Field label="Investment thesis" htmlFor="thesis" hint="What you look for and why. A few sentences." error={investor.state.fieldErrors?.thesis}>
            <Textarea id="thesis" name="thesis" rows={5} defaultValue={data.investor?.thesis ?? ''} />
          </Field>
          <Field label="Areas of expertise" htmlFor="expertise" hint="Comma separated. For example: go to market, regulated markets, hardware supply chains." error={investor.state.fieldErrors?.expertise}>
            <Input id="expertise" name="expertise" defaultValue={data.investor?.expertise.join(', ') ?? ''} />
          </Field>
          <Nav pending={investor.pending} back={back} />
        </form>
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell title="What do you back?" blurb="These are the filters Doorkey runs for you. Everything here is used directly by matching.">
        {preference.state.error && <Alert tone="error">{preference.state.error}</Alert>}
        <form action={preference.formAction} className="grid gap-5">
          <fieldset>
            <legend className="text-[13px] font-medium mb-2">Sectors you invest in</legend>
            {preference.state.fieldErrors?.sectorIds && <p className="text-[12.5px] text-alert mb-2">{preference.state.fieldErrors.sectorIds}</p>}
            <CheckList name="sectorIds" options={allSectors.map((s) => ({ value: s.id, label: s.name }))} selected={data.investor?.sectorIds ?? []} />
          </fieldset>

          <fieldset>
            <legend className="text-[13px] font-medium mb-2">Stages</legend>
            {preference.state.fieldErrors?.stages && <p className="text-[12.5px] text-alert mb-2">{preference.state.fieldErrors.stages}</p>}
            <CheckList name="stages" options={Object.entries(STAGE_LABEL).map(([v, l]) => ({ value: v, label: l }))} selected={data.investor?.stages ?? []} columns={3} />
          </fieldset>

          <fieldset>
            <legend className="text-[13px] font-medium mb-2">Geographies</legend>
            {preference.state.fieldErrors?.geographyIds && <p className="text-[12.5px] text-alert mb-2">{preference.state.fieldErrors.geographyIds}</p>}
            <CheckList name="geographyIds" options={vocab.geographies.map((g) => ({ value: g.id, label: g.name }))} selected={data.investor?.geographyIds ?? []} />
          </fieldset>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Currency" htmlFor="prefCurrency">
              <Select id="prefCurrency" name="currency" defaultValue={data.investor?.currency ?? 'GBP'}>
                {['GBP', 'USD', 'EUR', 'INR', 'SGD'].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Minimum cheque" htmlFor="minCheque" error={preference.state.fieldErrors?.minCheque} required>
              <Input id="minCheque" name="minCheque" type="number" min={0} step={5000} defaultValue={data.investor?.minCheque ?? 25000} required />
            </Field>
            <Field label="Maximum cheque" htmlFor="maxCheque" error={preference.state.fieldErrors?.maxCheque} required>
              <Input id="maxCheque" name="maxCheque" type="number" min={0} step={5000} defaultValue={data.investor?.maxCheque ?? 250000} required />
            </Field>
          </div>

          <Nav pending={preference.pending} back={back} />
        </form>
      </StepShell>
    );
  }

  return (
    <StepShell title="That is everything" blurb="Doorkey can now score companies against your thesis. You can change any of this later in settings.">
      <form action={finishOnboardingAction}>
        <Button type="submit" size="lg">See my deal flow</Button>
      </form>
    </StepShell>
  );
}
