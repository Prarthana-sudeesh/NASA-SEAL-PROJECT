import { useDroppable } from '@dnd-kit/core';
import { getComponent } from '../config/components.ts';
import type { Difficulty, ModuleType, RocketBuild, SlotId } from '../data/types.ts';
import { canPlace } from '../engine/build.ts';
import { PROTECTION_STYLE } from './parts/RocketParts.tsx';
import { Slot } from './Slot.tsx';

interface Props {
  build: RocketBuild;
  difficulty: Difficulty;
  modules: ModuleType[];
  onRemove: (slot: SlotId) => void;
  dragDisabled: boolean;
}

function ProtectionSlot({
  build,
  difficulty,
  onRemove,
}: Pick<Props, 'build' | 'difficulty' | 'onRemove'>) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: 'slot:protection',
    data: { slot: 'protection' },
  });
  const activeId = active?.data.current?.componentId as string | undefined;
  const valid = activeId ? canPlace(activeId, 'protection', difficulty).ok : false;
  const c = getComponent(build.protection);
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-xs ${
        active
          ? valid
            ? isOver
              ? 'border-ok bg-ok/15'
              : 'border-dashed border-ok/70'
            : 'border-space-700 opacity-60'
          : c
            ? 'border-space-600'
            : 'border-dashed border-space-500'
      }`}
    >
      <div>
        <div className="font-semibold">Protection layer</div>
        <div className="text-muted">
          {c
            ? `${c.name} wraps the whole rocket`
            : 'Drop protection here: it wraps the whole rocket'}
        </div>
      </div>
      {c && (
        <button
          type="button"
          className="btn btn-ghost btn-sm text-bad"
          onClick={() => onRemove('protection')}
          aria-label={`Remove ${c.name} from Protection layer`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Cutaway rocket with labelled slots: Payload → Comms → Pressure → Fuel ×3 → Thrusters ×2. */
export function RocketCanvas({ build, difficulty, modules, onRemove, dragDisabled }: Props) {
  const prot = build.protection ? PROTECTION_STYLE[build.protection] : null;
  const slotProps = { difficulty, onRemove, dragDisabled };
  return (
    <section aria-label="Rocket build area" className="panel flex flex-col items-center gap-2 p-3">
      <h2 className="self-start text-lg font-bold">Your rocket</h2>
      {modules.includes('protection') && <ProtectionSlot build={build} {...slotProps} />}
      <div
        className="relative flex w-full max-w-[260px] flex-col items-stretch gap-1.5 rounded-[2.5rem_2.5rem_1rem_1rem] px-3 pb-3 pt-4"
        style={{
          boxShadow: prot ? `0 0 0 ${prot.width}px ${prot.stroke}` : undefined,
          outline: prot?.dash ? `2px dashed ${prot.stroke}` : undefined,
          outlineOffset: prot ? 6 : undefined,
          background: 'linear-gradient(180deg, rgba(23,35,74,0.6), rgba(11,18,40,0.6))',
        }}
      >
        <Slot slot="payload" componentId={build.payload} {...slotProps} />
        <Slot slot="comms" componentId={build.comms} {...slotProps} />
        {modules.includes('pressure') && (
          <Slot slot="pressure" componentId={build.pressure} {...slotProps} />
        )}
        {(['fuel-0', 'fuel-1', 'fuel-2'] as SlotId[]).map((s, i) => (
          <Slot key={s} slot={s} componentId={build.fuel[i]} {...slotProps} />
        ))}
        <div className="grid grid-cols-2 gap-1.5">
          <Slot slot="thruster-0" componentId={build.thrusters[0]} {...slotProps} scale={1} />
          <Slot slot="thruster-1" componentId={build.thrusters[1]} {...slotProps} scale={1} />
        </div>
      </div>
      <p className="text-center text-[0.7rem] text-muted">
        Nose at the top, engines at the base. Up to 3 fuel tanks and 2 thrusters.
      </p>
    </section>
  );
}
