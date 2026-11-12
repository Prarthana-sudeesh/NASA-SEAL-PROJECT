import { useDroppable } from '@dnd-kit/core';
import { componentsFor, MODULE_DESCRIPTIONS, MODULE_LABELS } from '../config/components.ts';
import type { ModuleType, RocketBuild } from '../data/types.ts';
import { ComponentCard } from './ComponentCard.tsx';

interface Props {
  modules: ModuleType[];
  build: RocketBuild;
  onAdd: (id: string) => void;
  dragDisabled: boolean;
}

const ORDER: ModuleType[] = ['payload', 'thruster', 'fuel', 'comms', 'pressure', 'protection'];

function countInstalled(build: RocketBuild, id: string): number {
  return [
    build.payload,
    build.comms,
    build.pressure,
    build.protection,
    ...build.fuel,
    ...build.thrusters,
  ].filter((x) => x === id).length;
}

/** Component palette, grouped by module. Also a drop zone: drag a part here to remove it. */
export function Palette({ modules, build, onAdd, dragDisabled }: Props) {
  const { setNodeRef, isOver, active } = useDroppable({ id: 'palette-drop' });
  const draggingFromSlot = active?.data.current?.from === 'slot';
  return (
    <section
      ref={setNodeRef}
      aria-label="Component palette"
      className={`panel relative flex flex-col gap-3 p-3 transition-colors ${
        isOver && draggingFromSlot ? 'border-bad bg-bad/10' : ''
      }`}
    >
      <div>
        <h2 className="text-lg font-bold">Components</h2>
        <p className="text-xs text-muted">
          {dragDisabled
            ? 'Tap “Add” to fit a part to your rocket.'
            : 'Drag a part onto the rocket, or use “Add”. Drag a fitted part back here to remove it.'}
        </p>
      </div>
      {draggingFromSlot && (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-lg border border-dashed border-bad bg-space-900/95 p-3 text-center text-sm text-bad">
          ✕ Drop here to remove
        </div>
      )}
      {ORDER.filter((m) => modules.includes(m)).map((m) => (
        <div key={m} role="group" aria-labelledby={`pal-${m}`}>
          <h3 id={`pal-${m}`} className="eyebrow">
            {MODULE_LABELS[m]}
          </h3>
          <p className="mb-1 text-[0.7rem] text-muted">{MODULE_DESCRIPTIONS[m]}</p>
          <ul className="flex flex-col gap-1.5">
            {componentsFor(m).map((c) => (
              <ComponentCard
                key={c.id}
                component={c}
                onAdd={onAdd}
                dragDisabled={dragDisabled}
                installedCount={countInstalled(build, c.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
