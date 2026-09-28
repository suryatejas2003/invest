'use client';

import { useState } from 'react';
import { Button, Select } from '@/components/ui';

export interface FilterOption { value: string; label: string }

export interface FilterConfig {
  sectors: FilterOption[];
  industries: FilterOption[];
  geographies: FilterOption[];
  stages: FilterOption[];
  investorTypes?: FilterOption[];
  businessModels?: FilterOption[];
}

function CheckGroup({ name, legend, options, selected }: { name: string; legend: string; options: FilterOption[]; selected: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? options : options.slice(0, 6);

  return (
    <fieldset className="border-t border-line pt-4">
      <legend className="text-[13px] font-medium mb-2">{legend}</legend>
      <div className="grid gap-1.5">
        {shown.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-[13.5px] text-ink-soft cursor-pointer">
            <input
              type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)}
              className="w-4 h-4 accent-[var(--color-ink)]"
            />
            {o.label}
          </label>
        ))}
      </div>
      {options.length > 6 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 text-[12.5px] text-muted hover:text-ink underline underline-offset-2">
          {expanded ? 'Show fewer' : `Show all ${options.length}`}
        </button>
      )}
    </fieldset>
  );
}

/**
 * Filters submit as a plain GET form, so results are linkable, shareable and
 * work without JavaScript. The panel collapses on small screens.
 */
export function DiscoverFilters({ config, role, current }: {
  config: FilterConfig;
  role: 'ENTREPRENEUR' | 'INVESTOR';
  current: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const sel = (k: string) => current[k] ?? [];

  return (
    <>
      <Button type="button" variant="secondary" size="sm" className="lg:hidden w-full" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Hide filters' : 'Show filters'}
      </Button>

      <form method="get" className={`${open ? 'grid' : 'hidden'} lg:grid gap-4 content-start`}>
        <div className="grid gap-1.5">
          <label htmlFor="q" className="text-[13px] font-medium">Search</label>
          <input
            id="q" name="q" type="search" defaultValue={current.q?.[0] ?? ''}
            placeholder={role === 'ENTREPRENEUR' ? 'Name, fund or thesis' : 'Company or what they do'}
            className="w-full bg-paper-raised border border-line-strong rounded-[6px] px-3 py-2.5 text-[14px] focus:border-brass focus:outline-none"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="sort" className="text-[13px] font-medium">Sort by</label>
          <Select id="sort" name="sort" defaultValue={current.sort?.[0] ?? 'relevance'}>
            <option value="relevance">How well they fit</option>
            <option value="recent">Recently joined</option>
            <option value="name">Name</option>
          </Select>
        </div>

        <CheckGroup name="sector" legend="Sector" options={config.sectors} selected={sel('sector')} />
        <CheckGroup name="stage" legend="Stage" options={config.stages} selected={sel('stage')} />
        <CheckGroup name="geography" legend="Location" options={config.geographies} selected={sel('geography')} />

        {role === 'ENTREPRENEUR' && config.investorTypes && (
          <>
            <CheckGroup name="investorType" legend="Investor type" options={config.investorTypes} selected={sel('investorType')} />
            <fieldset className="border-t border-line pt-4">
              <legend className="text-[13px] font-medium mb-2">Cheque size covers</legend>
              <div className="grid grid-cols-2 gap-2">
                <input name="minCheque" type="number" min={0} step={5000} placeholder="From" defaultValue={current.minCheque?.[0] ?? ''}
                  className="w-full bg-paper-raised border border-line-strong rounded-[6px] px-3 py-2 text-[13.5px]" aria-label="Minimum cheque" />
                <input name="maxCheque" type="number" min={0} step={5000} placeholder="To" defaultValue={current.maxCheque?.[0] ?? ''}
                  className="w-full bg-paper-raised border border-line-strong rounded-[6px] px-3 py-2 text-[13.5px]" aria-label="Maximum cheque" />
              </div>
            </fieldset>
          </>
        )}

        {role === 'INVESTOR' && config.businessModels && (
          <>
            <CheckGroup name="businessModel" legend="Business model" options={config.businessModels} selected={sel('businessModel')} />
            <fieldset className="border-t border-line pt-4">
              <legend className="text-[13px] font-medium mb-2">Raising</legend>
              <div className="grid grid-cols-2 gap-2">
                <input name="minSeeking" type="number" min={0} step={50000} placeholder="From" defaultValue={current.minSeeking?.[0] ?? ''}
                  className="w-full bg-paper-raised border border-line-strong rounded-[6px] px-3 py-2 text-[13.5px]" aria-label="Minimum raise" />
                <input name="maxSeeking" type="number" min={0} step={50000} placeholder="To" defaultValue={current.maxSeeking?.[0] ?? ''}
                  className="w-full bg-paper-raised border border-line-strong rounded-[6px] px-3 py-2 text-[13.5px]" aria-label="Maximum raise" />
              </div>
              <label className="flex items-center gap-2 text-[13.5px] text-ink-soft mt-3 cursor-pointer">
                <input type="checkbox" name="hasTraction" value="true" defaultChecked={sel('hasTraction').length > 0} className="w-4 h-4 accent-[var(--color-ink)]" />
                Has revenue, users or customers
              </label>
            </fieldset>
          </>
        )}

        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" size="sm">Apply filters</Button>
          <a href="/discover" className="inline-flex items-center px-3 text-[13px] text-muted hover:text-ink">Clear</a>
        </div>
      </form>
    </>
  );
}
