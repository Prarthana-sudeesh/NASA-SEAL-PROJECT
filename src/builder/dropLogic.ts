import { getComponent } from '../config/components.ts';
import type { Difficulty, RocketBuild, SlotId } from '../data/types.ts';
import { canPlace, getSlot, placeInSlot, removeFromSlot, slotLabel } from '../engine/build.ts';

export type DragData =
  { from: 'palette'; componentId: string } | { from: 'slot'; slot: SlotId; componentId: string };

export interface DropOutcome {
  build: RocketBuild;
  ok: boolean;
  message: string;
}

/**
 * Resolve a drag-and-drop gesture into a new build.
 * - palette → slot: place (replacing what's there) or bounce back with a reason
 * - slot → slot: move, swapping when the target is filled
 * - slot → palette / outside: remove
 */
export function resolveDrop(
  build: RocketBuild,
  data: DragData,
  overId: string | null,
  difficulty: Difficulty,
): DropOutcome {
  const name = getComponent(data.componentId)?.name ?? 'Component';
  const targetSlot = overId?.startsWith('slot:') ? (overId.slice(5) as SlotId) : null;

  if (data.from === 'palette') {
    if (!targetSlot)
      return { build, ok: false, message: `${name} was dropped outside the rocket.` };
    const r = placeInSlot(build, data.componentId, targetSlot, difficulty);
    return {
      build: r.build,
      ok: r.ok,
      message: r.ok ? r.message : `Can't place ${name} there. ${r.message}`,
    };
  }

  // From a fitted slot.
  if (!targetSlot) {
    const r = removeFromSlot(build, data.slot);
    return { build: r.build, ok: r.ok, message: r.message };
  }
  if (targetSlot === data.slot)
    return { build, ok: false, message: `${name} stays in ${slotLabel(data.slot)}.` };
  const check = canPlace(data.componentId, targetSlot, difficulty);
  if (!check.ok) return { build, ok: false, message: `Can't move ${name} there. ${check.reason}` };
  const displaced = getSlot(build, targetSlot);
  let next = placeInSlot(build, data.componentId, targetSlot, difficulty).build;
  next = displaced
    ? placeInSlot(next, displaced, data.slot, difficulty).build
    : removeFromSlot(next, data.slot).build;
  return {
    build: next,
    ok: true,
    message: displaced
      ? `Swapped ${name} with ${getComponent(displaced)?.name} (${slotLabel(data.slot)} ↔ ${slotLabel(targetSlot)}).`
      : `Moved ${name} to ${slotLabel(targetSlot)}.`,
  };
}
