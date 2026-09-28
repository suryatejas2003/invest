import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { discoverInvestors, discoverStartups } from '@/server/discovery';
import { discoverQuerySchema } from '@/lib/validation/schemas';
import { savedIds } from '@/server/saved';
import { listConnections } from '@/server/connections';
import { PersonCard } from '@/components/app/PersonCard';
import { DiscoverFilters } from '@/components/app/DiscoverFilters';
import { EmptyState, Pagination, ButtonLink, Spinner } from '@/components/ui';
import { STAGE_LABEL, INVESTOR_TYPE_LABEL, BUSINESS_MODEL_LABEL } from '@/lib/config/vocab';

export const metadata: Metadata = { title: 'Discover' };
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const asArray = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const isFounder = user.role !== 'INVESTOR';

  const parsed = discoverQuerySchema.safeParse({
    q: searchParams.q,
    sector: asArray(searchParams.sector),
    industry: searchParams.industry,
    stage: asArray(searchParams.stage),
    geography: asArray(searchParams.geography),
    investorType: asArray(searchParams.investorType),
    businessModel: asArray(searchParams.businessModel),
    minCheque: searchParams.minCheque || undefined,
    maxCheque: searchParams.maxCheque || undefined,
    minSeeking: searchParams.minSeeking || undefined,
    maxSeeking: searchParams.maxSeeking || undefined,
    hasTraction: searchParams.hasTraction || undefined,
    sort: searchParams.sort ?? 'relevance',
    page: searchParams.page ?? 1,
  });

  const query = parsed.success ? parsed.data : discoverQuerySchema.parse({});

  const [results, saved, connectionData, sectors, geographies] = await Promise.all([
    isFounder ? discoverInvestors(user.id, query) : discoverStartups(user.id, query),
    savedIds(user.id),
    listConnections(user.id),
    prisma.sector.findMany({ orderBy: { name: 'asc' } }),
    prisma.geography.findMany({ orderBy: [{ region: 'asc' }, { name: 'asc' }] }),
  ]);

  const current: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(searchParams)) current[k] = asArray(v);

  const queryString = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      k === 'page' ? [] : asArray(v).map((x) => [k, x] as [string, string]),
    ),
  ).toString();

  return (
    <div className="grid gap-8 lg:grid-cols-[250px_1fr] lg:gap-10">
      <aside aria-label="Filters">
        <DiscoverFilters
          role={isFounder ? 'ENTREPRENEUR' : 'INVESTOR'}
          current={current}
          config={{
            sectors: sectors.map((s) => ({ value: s.code, label: s.name })),
            industries: [],
            geographies: geographies.map((g) => ({ value: g.code, label: g.name })),
            stages: Object.entries(STAGE_LABEL).map(([value, label]) => ({ value, label })),
            investorTypes: Object.entries(INVESTOR_TYPE_LABEL).map(([value, label]) => ({ value, label })),
            businessModels: Object.entries(BUSINESS_MODEL_LABEL).map(([value, label]) => ({ value, label })),
          }}
        />
      </aside>

      <section>
        <p className="text-[13.5px] text-muted mb-4" role="status">
          {results.total === 0
            ? 'No results'
            : `${results.total} ${isFounder ? 'investor' : 'company'}${results.total === 1 ? '' : 's'} match your filters`}
          {query.sort === 'relevance' && results.total > 0 && ', ordered by how well they fit'}
        </p>

        {results.items.length === 0 ? (
          <EmptyState
            title="Nothing matches those filters"
            body="Try removing a filter, widening the stage or cheque range, or searching a different term."
            action={<ButtonLink href="/discover" variant="secondary">Clear all filters</ButtonLink>}
          />
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2">
              {results.items.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  saved={saved.has(p.userId)}
                  connectionState={
                    connectionData.connections.some((c) => c.user.id === p.userId) ? 'connected'
                    : connectionData.outgoing.some((r) => r.recipientId === p.userId) ? 'pending_outgoing'
                    : connectionData.incoming.some((r) => r.requesterId === p.userId) ? 'pending_incoming'
                    : 'none'
                  }
                />
              ))}
            </ul>
            <div className="mt-8">
              <Pagination page={results.page} pageCount={results.pageCount} baseHref={`/discover${queryString ? `?${queryString}` : ''}`} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const user = await requireUser();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[clamp(1.6rem,4vw,2.1rem)]">
          {user.role === 'INVESTOR' ? 'Discover companies' : 'Discover investors'}
        </h1>
        <p className="mt-2 text-[15px] text-muted max-w-[60ch]">
          {user.role === 'INVESTOR'
            ? 'Every company here is scored against the thesis you set out, and tells you what it matched on.'
            : 'Filter down to the investors whose remit actually covers your company, then see why each one fits.'}
        </p>
      </div>

      <Suspense fallback={<div className="py-16 flex justify-center"><Spinner label="Finding matches" /></div>}>
        <Results searchParams={params} />
      </Suspense>
    </div>
  );
}
