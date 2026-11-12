import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getComponent, MODULE_LABELS } from '../config/components.ts';
import type { Difficulty, SlotId } from '../data/types.ts';
import { canPlace, slotLabel, slotModule } from '../engine/build.ts';
import { partHeight, PartGraphic, ThrusterCluster, VIEW_W } from './parts/RocketParts.tsx';

interface Props {
  slot: SlotId;
  componentId: string | null;
  difficulty: Difficulty;
  onRemove: (slot: SlotId) => void;
  dragDisabled: boolean;
  scale?: number;
}

function SlotGraphic({
  slot,
  componentId,
  scale,
}: {
  slot: SlotId;
  componentId: string;
  scale: number;
}) {
  const c = getComponent(componentId);
  if (!c) return null;
  const module = slotModule(slot);
  if (module === 'protection') return null;
  const h = partHeight(module, c);
  if (module === 'thruster') {
    return (
      <svg
        viewBox={`10 -32 ${VIEW_W - 20} ${h + 34}`}
        width={(VIEW_W - 20) * scale * 0.7}
        height={(h + 34) * scale * 0.7}
        aria-hidden="true"
      >
        <ThrusterCluster items={[c]} h={h} />
      </svg>
    );
  }
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${h}`}
      width={VIEW_W * scale}
      height={h * scale}
      aria-hidden="true"
    >
      <PartGraphic module={module} component={c} height={h} />
    </svg>
  );
}

export function Slot({
  slot,
  componentId,
  difficulty,
  onRemove,
  dragDisabled,
  scale = 1.25,
}: Props) {
  const module = slotModule(slot);
  const {
    setNodeRef: dropRef,
    isOver,
    active,
  } = useDroppable({ id: `slot:${slot}`, data: { slot } });
  const drag = useDraggable({
    id: `s:${slot}`,
    data: { from: 'slot', slot, componentId },
    disabled: dragDisabled || !componentId,
  });
  const activeId = active?.data.current?.componentId as string | undefined;
  const validTarget = activeId ? canPlace(activeId, slot, difficulty).ok : false;
  const c = getComponent(componentId);
  const label = slotLabel(slot);
  const emptyH =
    module === 'payload' ? 60 : module === 'fuel' ? 40 : module === 'thruster' ? 52 : 30;

  const ring = active
    ? validTarget
      ? isOver
        ? 'border-ok bg-ok/15'
        : 'border-ok/70 border-dashed'
      : isOver
        ? 'border-bad bg-bad/10'
        : 'border-space-700 opacity-60'
    : c
      ? 'border-transparent'
      : 'border-dashed border-space-500';

  return (
    <div
      ref={dropRef}
      className={`group relative flex items-center justify-center rounded-xl border-2 transition-colors ${ring}`}
      data-slot={slot}
    >
      {c ? (
        <div
          ref={drag.setNodeRef}
          {...(dragDisabled ? {} : drag.listeners)}
          {...(dragDisabled ? {} : drag.attributes)}
          aria-roledescription={dragDisabled ? undefined : 'fitted component'}
          aria-label={
            dragDisabled
              ? undefined
              : `${label}: ${c.name}. Press space to pick up and move or remove.`
          }
          className={`relative flex flex-col items-center py-0.5 ${dragDisabled ? '' : 'cursor-grab touch-none'} ${drag.isDragging ? 'opacity-30' : ''}`}
        >
          <SlotGraphic slot={slot} componentId={c.id} scale={scale} />
          <span className="pointer-events-none mt-0.5 max-w-full truncate text-center text-[0.65rem] font-semibold text-ink/90">
            {c.name}
          </span>
        </div>
      ) : (
        <div
          className="flex w-full flex-col items-center justify-center px-2 text-center text-[0.7rem] text-muted"
          style={{ minHeight: emptyH * scale * 0.8 }}
        >
          <span className="font-semibold text-ink/80">{label}</span>
          <span>Drop {MODULE_LABELS[module].toLowerCase()} here</span>
        </div>
      )}
      {c && (
        <button
          type="button"
          onClick={() => onRemove(slot)}
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-space-600 bg-space-800 text-sm text-bad hover:border-bad focus-visible:opacity-100"
          aria-label={`Remove ${c.name} from ${label}`}
          title={`Remove ${c.name}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}
