import type { Provenance } from '../data/types.ts';

const INFO: Record<Provenance, { label: string; title: string; cls: string; icon: string }> = {
  nasa: {
    label: 'NASA DATA',
    title: 'Real catalogue value from the NASA Exoplanet Archive',
    cls: 'border-nasa/60 text-nasa bg-nasa/10',
    icon: '◆',
  },
  model: {
    label: 'GAME MODEL',
    title: 'Simplified gameplay assumption or a value computed by the game',
    cls: 'border-model/60 text-model bg-model/10',
    icon: '⚙',
  },
};

export function Badge({ source, className = '' }: { source: Provenance; className?: string }) {
  const i = INFO[source];
  return (
    <span
      title={i.title}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[0.62rem] font-bold tracking-wider whitespace-nowrap ${i.cls} ${className}`}
    >
      <span aria-hidden="true">{i.icon}</span>
      {i.label}
    </span>
  );
}
