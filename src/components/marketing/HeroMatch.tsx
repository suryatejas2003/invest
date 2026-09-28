'use client';

import { useState } from 'react';
import { MatchReasons, Avatar } from '@/components/ui';

export interface HeroPair {
  name: string;
  subtitle: string;
  meta: string;
  reasons: string[];
}

/**
 * The hero is the product, not a picture of it: the same matching pass that
 * runs in the app, shown against sample profiles. Switching side re-frames
 * the result the way discovery does.
 */
export function HeroMatch({ founderView, investorView }: { founderView: HeroPair[]; investorView: HeroPair[] }) {
  const [side, setSide] = useState<'founder' | 'investor'>('founder');
  const pairs = side === 'founder' ? founderView : investorView;

  return (
    <div className="bg-paper-raised border border-line rounded-[12px] overflow-hidden shadow-[0_1px_0_rgba(17,26,34,0.04)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line bg-paper">
        <p className="text-[13px] text-muted">
          {side === 'founder' ? 'Shown to a seed-stage climate founder' : 'Shown to a seed fintech investor'}
        </p>
        <div className="flex rounded-[6px] border border-line-strong overflow-hidden shrink-0" role="group" aria-label="Choose a point of view">
          {(['founder', 'investor'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={`px-3 py-1.5 text-[12.5px] capitalize transition-colors ${
                side === s ? 'bg-ink text-paper' : 'bg-paper-raised text-ink-soft hover:bg-brass-soft/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-line">
        {pairs.map((p) => (
          <li key={p.name} className="p-4 grid gap-3">
            <div className="flex items-start gap-3">
              <Avatar name={p.name} size={38} />
              <div className="min-w-0">
                <p className="text-[15px] font-medium leading-tight">{p.name}</p>
                <p className="text-[13px] text-muted leading-snug">{p.subtitle}</p>
                <p className="text-[12.5px] text-ink-soft mt-1">{p.meta}</p>
              </div>
            </div>
            <MatchReasons reasons={p.reasons} />
          </li>
        ))}
      </ul>
    </div>
  );
}
