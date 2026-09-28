import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { listSaved } from '@/server/saved';
import { Avatar, Card, Chip, EmptyState, ButtonLink } from '@/components/ui';
import { SaveToggle } from '@/components/app/ActionForms';
import { money } from '@/lib/utils/format';
import { STAGE_LABEL, INVESTOR_TYPE_LABEL } from '@/lib/config/vocab';

export const metadata: Metadata = { title: 'Saved' };
export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const user = await requireUser();
  const saved = await listSaved(user.id);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[clamp(1.6rem,4vw,2.1rem)]">Saved</h1>
        <p className="mt-2 text-[15px] text-muted">Your private shortlist. Nobody is told when you save them.</p>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Use Save on any profile to keep it here for a second look."
          action={<ButtonLink href="/discover">Open Discover</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {saved.map((s) => {
            const p = s.subject.profile;
            const startup = p?.founderOf[0]?.startup;
            return (
              <Card as="li" key={s.id} className="p-4 flex gap-4">
                <Avatar name={p?.displayName ?? '?'} src={p?.photoUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-tight">
                    <Link href={`/p/${p?.slug}`} className="hover:text-brass">{p?.displayName}</Link>
                  </p>
                  <p className="text-[13px] text-muted truncate">
                    {p?.investor
                      ? [p.investor.organization?.name, INVESTOR_TYPE_LABEL[p.investor.investorType]].filter(Boolean).join(' · ')
                      : startup
                        ? `${startup.name} · ${STAGE_LABEL[startup.stage]}`
                        : (p?.headline ?? '')}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {startup?.amountSeeking != null && <Chip>Raising {money(startup.amountSeeking, startup.currency)}</Chip>}
                    {p?.investor?.preference && (
                      <Chip>{money(p.investor.preference.minCheque, p.investor.preference.currency)}–{money(p.investor.preference.maxCheque, p.investor.preference.currency)}</Chip>
                    )}
                  </div>
                  <div className="mt-3"><SaveToggle userId={s.subjectId} saved /></div>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
