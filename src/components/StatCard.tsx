import type { ReactNode } from 'react';
import type { Provenance } from '../data/types.ts';
import { Badge } from './Badge.tsx';

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  source?: Provenance;
  sub?: ReactNode;
}

export function StatCard({ label, value, unit, source, sub }: Props) {
  return (
    <div className="rounded-xl border border-space-700 bg-space-900/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted">{label}</span>
        {source && <Badge source={source} />}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
