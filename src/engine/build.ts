// Pure rocket-build helpers: slot rules, placement, derived stats and launch blocks.
import { ASTRONAUT_MASS_T, getComponent, MODULE_LABELS } from '../config/components.ts';
import { DIFFICULTY } from '../config/difficulty.ts';
import { G0, MAX_OVERSPEND } from '../config/physics.ts';
import type {
  BuildStats,
  CommsComponent,
  Difficulty,
  FuelComponent,
  MissionRequirements,
  ModuleType,
  PayloadComponent,
  PressureComponent,
  ProtectionComponent,
  RocketBuild,
  RocketComponent,
  SlotId,
  ThrusterComponent,
} from '../data/types.ts';
import { thrustToWeight } from './physics.ts';

/** Slot order, top (nose) to bottom (engines). Protection wraps the whole rocket. */
export const SLOT_ORDER: SlotId[] = [
  'payload',
  'comms',
  'pressure',
  'fuel-0',
  'fuel-1',
  'fuel-2',
  'thruster-0',
  'thruster-1',
  'protection',
];

export function slotModule(slot: SlotId): ModuleType {
  if (slot.startsWith('fuel')) return 'fuel';
  if (slot.startsWith('thruster')) return 'thruster';
  return slot as ModuleType;
}

export function slotLabel(slot: SlotId): string {
  if (slot.startsWith('fuel')) return `Fuel Tank ${Number(slot.slice(-1)) + 1}`;
  if (slot.startsWith('thruster')) return `Thruster ${Number(slot.slice(-1)) + 1}`;
  return MODULE_LABELS[slot as ModuleType];
}

export function emptyBuild(): RocketBuild {
  return {
    payload: null,
    comms: null,
    pressure: null,
    fuel: [null, null, null],
    thrusters: [null, null],
    protection: null,
    crew: 0,
  };
}

export function getSlot(build: RocketBuild, slot: SlotId): string | null {
  switch (slot) {
    case 'payload':
    case 'comms':
    case 'pressure':
    case 'protection':
      return build[slot];
    case 'fuel-0':
    case 'fuel-1':
    case 'fuel-2':
      return build.fuel[Number(slot.slice(-1))];
    case 'thruster-0':
    case 'thruster-1':
      return build.thrusters[Number(slot.slice(-1))];
  }
}

function setSlot(build: RocketBuild, slot: SlotId, id: string | null): RocketBuild {
  const next: RocketBuild = {
    ...build,
    fuel: [...build.fuel] as RocketBuild['fuel'],
    thrusters: [...build.thrusters] as RocketBuild['thrusters'],
  };
  switch (slot) {
    case 'payload':
    case 'comms':
    case 'pressure':
    case 'protection':
      next[slot] = id;
      break;
    case 'fuel-0':
    case 'fuel-1':
    case 'fuel-2':
      next.fuel[Number(slot.slice(-1))] = id;
      break;
    case 'thruster-0':
    case 'thruster-1':
      next.thrusters[Number(slot.slice(-1))] = id;
      break;
  }
  return next;
}

export interface PlacementCheck {
  ok: boolean;
  reason?: string;
}

export function canPlace(
  componentId: string,
  slot: SlotId,
  difficulty: Difficulty,
): PlacementCheck {
  const c = getComponent(componentId);
  if (!c) return { ok: false, reason: 'Unknown component.' };
  if (!DIFFICULTY[difficulty].modules.includes(c.module)) {
    return {
      ok: false,
      reason: `${MODULE_LABELS[c.module]} are not used on ${DIFFICULTY[difficulty].label}.`,
    };
  }
  const target = slotModule(slot);
  if (target !== c.module) {
    return {
      ok: false,
      reason: `${c.name} is a ${MODULE_LABELS[c.module]} part. It can't go in the ${slotLabel(slot)} slot.`,
    };
  }
  return { ok: true };
}

export interface PlacementResult {
  build: RocketBuild;
  ok: boolean;
  message: string;
  replaced?: string;
  slot?: SlotId;
}

/** Place a component into a specific slot (replacing what's there). */
export function placeInSlot(
  build: RocketBuild,
  componentId: string,
  slot: SlotId,
  difficulty: Difficulty,
): PlacementResult {
  const check = canPlace(componentId, slot, difficulty);
  const c = getComponent(componentId);
  if (!check.ok || !c) return { build, ok: false, message: check.reason ?? 'Cannot place.' };
  const previous = getSlot(build, slot);
  let next = setSlot(build, slot, componentId);
  if (c.module === 'payload') next = clampCrew(next, difficulty);
  const prevName = previous ? getComponent(previous)?.name : undefined;
  return {
    build: next,
    ok: true,
    slot,
    replaced: previous ?? undefined,
    message: prevName
      ? `Replaced ${prevName} with ${c.name} in ${slotLabel(slot)}.`
      : `Added ${c.name} to ${slotLabel(slot)}.`,
  };
}

/** Add a component to the first free valid slot (click/tap/keyboard alternative to dragging). */
export function addComponent(
  build: RocketBuild,
  componentId: string,
  difficulty: Difficulty,
): PlacementResult {
  const c = getComponent(componentId);
  if (!c) return { build, ok: false, message: 'Unknown component.' };
  const slots = SLOT_ORDER.filter((s) => slotModule(s) === c.module);
  const free = slots.find((s) => getSlot(build, s) === null);
  // Single-slot modules are swapped; multi-slot modules use the last slot when full.
  const target = free ?? slots[slots.length - 1];
  return placeInSlot(build, componentId, target, difficulty);
}

export function removeFromSlot(build: RocketBuild, slot: SlotId): PlacementResult {
  const previous = getSlot(build, slot);
  if (!previous) return { build, ok: false, message: `${slotLabel(slot)} is already empty.` };
  const next = setSlot(build, slot, null);
  return {
    build: next,
    ok: true,
    slot,
    message: `Removed ${getComponent(previous)?.name ?? 'component'} from ${slotLabel(slot)}.`,
  };
}

export function clampCrew(build: RocketBuild, difficulty: Difficulty): RocketBuild {
  const payload = getComponent(build.payload) as PayloadComponent | undefined;
  const max = Math.min(
    DIFFICULTY[difficulty].maxCrew,
    payload?.maxCrew ?? DIFFICULTY[difficulty].maxCrew,
  );
  return build.crew > max ? { ...build, crew: max } : build;
}

/** Drop components that are not in play for a difficulty (e.g. after switching difficulty). */
export function sanitizeBuild(build: RocketBuild, difficulty: Difficulty): RocketBuild {
  let next = build;
  for (const slot of SLOT_ORDER) {
    const id = getSlot(next, slot);
    if (id && !canPlace(id, slot, difficulty).ok) next = setSlot(next, slot, null);
  }
  const crew = Math.max(0, Math.min(next.crew, DIFFICULTY[difficulty].maxCrew));
  return { ...next, crew };
}

// ---------- Typed accessors ----------

export interface InstalledParts {
  payload?: PayloadComponent;
  comms?: CommsComponent;
  pressure?: PressureComponent;
  protection?: ProtectionComponent;
  fuel: FuelComponent[];
  thrusters: ThrusterComponent[];
  all: RocketComponent[];
}

export function installed(build: RocketBuild): InstalledParts {
  const fuel = build.fuel.map((id) => getComponent(id)).filter(Boolean) as FuelComponent[];
  const thrusters = build.thrusters
    .map((id) => getComponent(id))
    .filter(Boolean) as ThrusterComponent[];
  const payload = getComponent(build.payload) as PayloadComponent | undefined;
  const comms = getComponent(build.comms) as CommsComponent | undefined;
  const pressure = getComponent(build.pressure) as PressureComponent | undefined;
  const protection = getComponent(build.protection) as ProtectionComponent | undefined;
  const all = [payload, comms, pressure, ...fuel, ...thrusters, protection].filter(
    Boolean,
  ) as RocketComponent[];
  return { payload, comms, pressure, protection, fuel, thrusters, all };
}

/** Thrusters that fire for high-thrust burns (lift-off, landing, ascent). */
export function liftThrusters(parts: InstalledParts): ThrusterComponent[] {
  return parts.thrusters.filter((t) => t.canLiftOff);
}

/** Thrust-weighted Isp of lift-capable engines firing together. */
export function liftIsp(parts: InstalledParts): number {
  const lift = liftThrusters(parts);
  const thrust = lift.reduce((s, t) => s + t.thrustKN, 0);
  if (thrust === 0) return 0;
  // Combined Isp = total thrust / total mass flow.
  const flow = lift.reduce((s, t) => s + t.thrustKN / t.ispS, 0);
  return thrust / flow;
}

export function bestIsp(parts: InstalledParts): number {
  return parts.thrusters.reduce((m, t) => Math.max(m, t.ispS), 0);
}

/**
 * Effective Isp across the mission's legs: high-thrust legs use lift engines, others the most
 * efficient engine. Because burns chain multiplicatively, Δv available with this Isp is exactly
 * the Δv the mission simulation can deliver.
 */
export function effectiveIsp(parts: InstalledParts, req?: MissionRequirements): number {
  const best = bestIsp(parts);
  if (!req) return best;
  const lift = liftIsp(parts);
  let total = 0;
  let weighted = 0;
  for (const leg of req.legs) {
    const isp = leg.highThrust ? lift : best;
    if (isp <= 0) return 0;
    total += leg.deltaVKms;
    weighted += leg.deltaVKms / isp;
  }
  return weighted > 0 ? total / weighted : best;
}

export function buildCost(build: RocketBuild): number {
  return installed(build).all.reduce((s, c) => s + c.cost, 0);
}

export function buildStats(build: RocketBuild, req?: MissionRequirements): BuildStats {
  const parts = installed(build);
  const dry = parts.all.reduce((s, c) => s + c.massT, 0) + build.crew * ASTRONAUT_MASS_T;
  const fuel = parts.fuel.reduce((s, f) => s + f.fuelT, 0);
  const wet = dry + fuel;
  const isp = effectiveIsp(parts, req);
  const liftThrust = liftThrusters(parts).reduce((s, t) => s + t.thrustKN, 0);
  const dv = dry > 0 && fuel > 0 && isp > 0 ? (isp * G0 * Math.log(wet / dry)) / 1000 : 0;
  return {
    cost: parts.all.reduce((s, c) => s + c.cost, 0),
    dryMassT: round1(dry),
    fuelT: fuel,
    wetMassT: round1(wet),
    deltaVKms: Math.round(dv * 100) / 100,
    liftoffTWR: Math.round(thrustToWeight(liftThrust, wet) * 100) / 100,
    liftoffThrustKN: liftThrust,
    bestIspS: bestIsp(parts),
    commsTier: parts.comms?.rangeTier ?? 0,
    pressureAtm: parts.pressure?.ratingAtm ?? 0,
    crewRated: (parts.payload?.maxCrew ?? 0) > 0,
    protectionRange: parts.protection ? [parts.protection.minK, parts.protection.maxK] : null,
    lifeSupportDays: parts.payload?.lifeSupportDays ?? 0,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface LaunchBlock {
  id: 'no-thruster' | 'no-fuel' | 'no-payload' | 'crew-no-cabin' | 'over-budget';
  message: string;
}

/** Hard blocks that prevent launch. Everything else is allowed so players can fail and learn. */
export function launchBlocks(build: RocketBuild, difficulty: Difficulty): LaunchBlock[] {
  const parts = installed(build);
  const budget = DIFFICULTY[difficulty].budget;
  const cost = buildCost(build);
  const blocks: LaunchBlock[] = [];
  if (!parts.payload) blocks.push({ id: 'no-payload', message: 'Add a payload system.' });
  if (parts.thrusters.length === 0)
    blocks.push({ id: 'no-thruster', message: 'Add at least one thruster.' });
  if (parts.fuel.length === 0)
    blocks.push({ id: 'no-fuel', message: 'Add at least one fuel tank.' });
  if (build.crew > 0 && (parts.payload?.maxCrew ?? 0) < build.crew)
    blocks.push({
      id: 'crew-no-cabin',
      message: parts.payload
        ? `${parts.payload.name} can carry ${parts.payload.maxCrew} crew. Remove astronauts or fit a bigger crew payload.`
        : 'Astronauts need a crew-rated payload.',
    });
  if (cost > budget * (1 + MAX_OVERSPEND))
    blocks.push({
      id: 'over-budget',
      message: `Cost ${cost} is more than 15% over the ${budget}-credit budget (limit ${Math.floor(
        budget * (1 + MAX_OVERSPEND),
      )}).`,
    });
  return blocks;
}
