import { useDraggable } from '@dnd-kit/core';
import type { RocketComponent } from '../data/types.ts';
import { PartIcon } from './parts/RocketParts.tsx';

export function keyStats(c: RocketComponent): string[] {
  switch (c.module) {
    case 'payload':
      return [
        c.maxCrew ? `Crew ≤ ${c.maxCrew}` : 'No crew',
        c.landerLegs ? 'Lander legs' : 'No legs',
        ...(c.lab ? ['Lab'] : []),
        ...(c.sampleBay ? ['Sample bay'] : []),
        ...(c.lifeSupportDays ? [`${c.lifeSupportDays} d life support`] : []),
      ];
    case 'thruster':
      return [
        `${c.thrustKN.toLocaleString()} kN`,
        `Isp ${c.ispS} s`,
        ...(c.canLiftOff ? [] : ['Needs booster']),
      ];
    case 'fuel':
      return [`${c.fuelT} t fuel`];
    case 'comms':
      return [`Range tier ${c.rangeTier}`];
    case 'pressure':
      return [`${c.ratingAtm} atm`, ...(c.crewRated ? ['Crew-rated'] : [])];
    case 'protection':
      return [`${c.minK.toLocaleString()}–${c.maxK.toLocaleString()} K`];
  }
}

interface Props {
  component: RocketComponent;
  onAdd: (id: string) => void;
  dragDisabled?: boolean;
  installedCount?: number;
}

export function ComponentCard({
  component: c,
  onAdd,
  dragDisabled = false,
  installedCount = 0,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `p:${c.id}`,
    data: { from: 'palette', componentId: c.id },
    disabled: dragDisabled,
  });
  const mass = c.module === 'fuel' ? `${c.massT} t dry + ${c.fuelT} t fuel` : `${c.massT} t`;
  return (
    <li
      className={`flex items-center gap-2 rounded-xl border bg-space-900/80 p-2 ${
        isDragging ? 'border-accent opacity-40' : 'border-space-700'
      }`}
    >
      <div
        ref={setNodeRef}
        {...(dragDisabled ? {} : listeners)}
        {...(dragDisabled ? {} : attributes)}
        aria-roledescription={dragDisabled ? undefined : 'draggable component'}
        aria-label={
          dragDisabled
            ? undefined
            : `${c.name}: ${c.cost} credits, ${mass}. ${keyStats(c).join(', ')}. Press space to pick up.`
        }
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg ${dragDisabled ? '' : 'cursor-grab touch-none active:cursor-grabbing'}`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-space-800">
          <PartIcon component={c} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{c.name}</span>
            <span className="shrink-0 text-xs font-bold text-accent-soft tabular-nums">
              {c.cost} cr
            </span>
          </div>
          <div className="text-[0.7rem] text-muted tabular-nums">{mass}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {keyStats(c).map((s) => (
              <span key={s} className="rounded bg-space-700/70 px-1 text-[0.65rem] text-ink">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm shrink-0"
        onClick={() => onAdd(c.id)}
        aria-label={`Add ${c.name} to rocket`}
      >
        + Add
        {installedCount > 0 && <span className="text-[0.65rem] text-ok">×{installedCount}</span>}
      </button>
    </li>
  );
}
