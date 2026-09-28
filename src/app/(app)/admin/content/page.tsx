import type { Metadata } from 'next';
import { adminVocabulary } from '@/server/admin';
import { Card, Chip } from '@/components/ui';

export const metadata: Metadata = { title: 'Admin · Content' };
export const dynamic = 'force-dynamic';

export default async function AdminContentPage() {
  const { industries, geographies } = await adminVocabulary();

  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <div>
          <h2 className="text-[17px]">Industries and sectors</h2>
          <p className="mt-1.5 text-[13.5px] text-muted max-w-[60ch] leading-relaxed">
            These are the values founders and investors pick from. Matching runs on them, so adding or
            renaming one changes what everybody sees. Seeded by <code className="px-1 bg-paper border border-line rounded">npm run db:seed</code>.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {industries.map((i) => (
            <Card as="li" key={i.id} className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px]">{i.name}</h3>
                <span className="text-[12px] text-muted">{i._count.startups} companies</span>
              </div>
              <ul className="flex flex-wrap gap-1.5 mt-2.5">
                {i.sectors.map((s) => <li key={s.id}><Chip>{s.name}</Chip></li>)}
              </ul>
            </Card>
          ))}
        </ul>
      </section>

      <section className="grid gap-4">
        <h2 className="text-[17px]">Geographies</h2>
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {geographies.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 border border-line rounded-[6px] px-3 py-2">
              <span className="text-[13.5px]">{g.name}</span>
              <span className="text-[12px] text-muted">{g.region} · {g._count.startups + g._count.profiles}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
