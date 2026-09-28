import Link from 'next/link';
import { Avatar, Card, Chip, MatchReasons, DemoTag } from '@/components/ui';
import { ConnectForm, SaveToggle } from './ActionForms';
import { money } from '@/lib/utils/format';

export interface PersonCardData {
  userId: string;
  slug: string;
  name: string;
  subtitle: string;
  photoUrl: string | null;
  location: string | null;
  isDemo: boolean;
  tags: string[];
  facts: Array<{ label: string; value: string }>;
  reasons: string[];
  band: 'strong' | 'relevant' | 'possible';
}

/** `12|GBP` and `1000-5000|GBP` are encoded by the discovery layer so money
 *  formatting stays in one place. */
function renderFact(value: string) {
  if (!value.includes('|')) return value;
  const [amounts, currency] = value.split('|');
  if (amounts.includes('-')) {
    const [min, max] = amounts.split('-');
    return `${money(Number(min), currency)} – ${money(Number(max), currency)}`;
  }
  return money(Number(amounts), currency);
}

export function PersonCard({ person, saved, connectionState }: {
  person: PersonCardData;
  saved: boolean;
  connectionState: 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected' | 'blocked' | 'self';
}) {
  return (
    <Card as="li" className="p-5 grid gap-4 content-start">
      <div className="flex items-start gap-3">
        <Avatar name={person.name} src={person.photoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] leading-tight">
            <Link href={`/p/${person.slug}`} className="hover:text-brass">{person.name}</Link>
          </h3>
          <p className="text-[13px] text-muted leading-snug capitalize">{person.subtitle}</p>
          {person.location && <p className="text-[12.5px] text-muted mt-0.5">{person.location}</p>}
        </div>
        {person.isDemo && <DemoTag />}
      </div>

      {person.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {person.tags.map((t) => <li key={t}><Chip>{t}</Chip></li>)}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] border-t border-line pt-3">
        {person.facts.map((f) => (
          <div key={f.label}>
            <dt className="text-muted text-[12px]">{f.label}</dt>
            <dd className="text-ink-soft capitalize">{renderFact(f.value)}</dd>
          </div>
        ))}
      </dl>

      <MatchReasons reasons={person.reasons} band={person.band} />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {connectionState === 'none' && <ConnectForm recipientId={person.userId} compact />}
        {connectionState === 'pending_outgoing' && <Chip tone="brass">Request pending</Chip>}
        {connectionState === 'pending_incoming' && <Chip tone="brass">They asked to connect</Chip>}
        {connectionState === 'connected' && <Chip tone="signal">Connected</Chip>}
        <SaveToggle userId={person.userId} saved={saved} />
      </div>
    </Card>
  );
}
