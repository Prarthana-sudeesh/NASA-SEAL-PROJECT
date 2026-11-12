// Generates plain-English engineering debriefs tied to the player's actual choices.
import { componentsFor, getComponent } from '../config/components.ts';
import { DIFFICULTY } from '../config/difficulty.ts';
import { ATMOSPHERE_INFO, MIN_LIFTOFF_TWR, PRESSURE_BY_ATMOSPHERE } from '../config/physics.ts';
import type {
  AttemptScore,
  CheckResult,
  DebriefItem,
  Difficulty,
  MissionResult,
  Planet,
  RocketBuild,
  SlotId,
} from '../data/types.ts';
import {
  buildCost,
  buildStats,
  getSlot,
  installed,
  placeInSlot,
  removeFromSlot,
  SLOT_ORDER,
  slotLabel,
  slotModule,
} from './build.ts';
import type { Evaluation } from './mission.ts';
import { evaluateBuild, simulateMission } from './mission.ts';
import { kelvinToCelsius } from './physics.ts';
import { selectionBreakdown } from './scoring.ts';

const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const f2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

const STAGE_NAMES: Record<MissionResult['stageReached'], string> = {
  launch: 'launch',
  orbit: 'Earth orbit',
  transit: 'the outbound transit',
  approach: 'the approach',
  landing: 'landing',
  surface: 'surface operations',
  ascent: 'the ascent',
  return: 'the return journey',
  reentry: 'Earth re-entry',
};

const STAGE_WORDS: Record<string, string> = {
  'fuel-launch': 'climbing away from Earth',
  'fuel-transit': 'the outbound transit',
  'fuel-landing': 'the landing burn',
  'fuel-ascent': 'the ascent from the surface',
  'fuel-return': 'the return transit',
  reentry: 'the final Earth-arrival burn',
};

export interface FixSuggestion {
  description: string;
  costDelta: number;
  build: RocketBuild;
}

/** Search single changes (swap, add, remove, fewer crew) that would make the mission succeed. */
export function suggestFixes(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
  limit = 3,
): FixSuggestion[] {
  const baseCost = buildCost(build);
  const modules = DIFFICULTY[difficulty].modules;
  const out: FixSuggestion[] = [];
  const tryBuild = (next: RocketBuild, description: string) => {
    const cost = buildCost(next);
    if (cost > DIFFICULTY[difficulty].budget * 1.15) return;
    if (simulateMission(next, planet, difficulty).success) {
      out.push({ description, costDelta: cost - baseCost, build: next });
    }
  };
  for (const slot of SLOT_ORDER) {
    const module = slotModule(slot);
    if (!modules.includes(module)) continue;
    const current = getComponent(getSlot(build, slot));
    for (const option of componentsFor(module)) {
      if (option.id === current?.id) continue;
      const placed = placeInSlot(build, option.id, slot, difficulty);
      if (!placed.ok) continue;
      tryBuild(
        placed.build,
        current
          ? `swap the ${current.name} for a ${option.name} (${slotLabel(slot)})`
          : `add a ${option.name} in the ${slotLabel(slot)} slot`,
      );
    }
    if (current && (module === 'fuel' || module === 'thruster')) {
      const removed = removeFromSlot(build, slot as SlotId);
      tryBuild(removed.build, `remove the ${current.name} from ${slotLabel(slot)}`);
    }
  }
  if (build.crew > 0) {
    tryBuild({ ...build, crew: 0 }, 'fly this one uncrewed');
  }
  return out.sort((a, b) => a.costDelta - b.costDelta).slice(0, limit);
}

/** Single changes that make one specific failing check pass (even if a later stage still fails). */
export function suggestCheckFix(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
  checkId: CheckResult['id'],
): FixSuggestion | null {
  const baseCost = buildCost(build);
  const modules = DIFFICULTY[difficulty].modules;
  let best: FixSuggestion | null = null;
  for (const slot of SLOT_ORDER) {
    const module = slotModule(slot);
    if (!modules.includes(module)) continue;
    const current = getComponent(getSlot(build, slot));
    for (const option of componentsFor(module)) {
      if (option.id === current?.id) continue;
      const placed = placeInSlot(build, option.id, slot, difficulty);
      if (!placed.ok) continue;
      const check = evaluateBuild(placed.build, planet, difficulty).checks.find(
        (c) => c.id === checkId,
      );
      if (!check || check.status === 'fail') continue;
      const costDelta = buildCost(placed.build) - baseCost;
      if (!best || costDelta < best.costDelta) {
        best = {
          description: current
            ? `swap the ${current.name} for a ${option.name}`
            : `add a ${option.name} (${slotLabel(slot)})`,
          costDelta,
          build: placed.build,
        };
      }
    }
  }
  return best;
}

function causeText(c: CheckResult, build: RocketBuild, planet: Planet, ev: Evaluation): string {
  const parts = installed(build);
  const stats = buildStats(build, ev.requirements);
  const req = ev.requirements;
  switch (c.id) {
    case 'liftoff-twr':
      if (parts.thrusters.length > 0 && parts.thrusters.every((t) => !t.canLiftOff)) {
        return `Your Ion Hybrid is very efficient but only gives ${parts.thrusters[0].thrustKN.toLocaleString()} kN and can't lift off on its own. It needs a chemical or nuclear booster in the second thruster slot.`;
      }
      return `Lift-off thrust-to-weight was ${f2(stats.liftoffTWR)}, but at least ${f2(MIN_LIFTOFF_TWR)} is needed: ${stats.liftoffThrustKN.toLocaleString()} kN of thrust couldn't lift a ${f1(stats.wetMassT)} t rocket off the pad. Add a second thruster, use a stronger engine, or carry less fuel.`;
    case 'fuel-launch':
    case 'fuel-transit':
    case 'fuel-landing':
    case 'fuel-ascent':
    case 'fuel-return':
    case 'reentry': {
      const leg = ev.fuelLegs.find((l) => l.leg.stage === c.stage);
      const need = leg ? leg.needT : 0;
      return `You ran out of fuel during ${STAGE_WORDS[c.id]}: it needed ${f1(need)} t of propellant but only ${f1(Number(c.actual))} t was left. Your design delivers ${f2(stats.deltaVKms)} km/s of Δv, but the round trip to ${planet.name} needs ${f2(req.deltaVKms)} km/s.`;
    }
    case 'comms': {
      const comms = parts.comms;
      return comms
        ? `Your ${comms.name} reaches range tier ${comms.rangeTier}, but ${planet.name} is ${f1(planet.distanceLy.value)} light-years away and needs tier ${req.commsTier}. Mission control lost contact during transit and the rocket drifted off course.`
        : `With no communication system on board, mission control lost contact during transit. ${planet.name} needs range tier ${req.commsTier}.`;
    }
    case 'protection': {
      const T = planet.eqTempK.value;
      const p = parts.protection;
      const hot = p ? T > p.maxK : T > 400;
      return p
        ? `${planet.name} is about ${Math.round(T)} K (${Math.round(kelvinToCelsius(T))} °C). Your ${p.name} only covers ${p.minK}–${p.maxK} K, so the spacecraft ${hot ? 'overheated and burned up' : 'froze'} on approach.`
        : `${planet.name} is about ${Math.round(T)} K (${Math.round(kelvinToCelsius(T))} °C). Without a protection system the spacecraft couldn't survive the approach.`;
    }
    case 'pressure': {
      const need = PRESSURE_BY_ATMOSPHERE[planet.atmosphere.value];
      const atmo = ATMOSPHERE_INFO[planet.atmosphere.value].label;
      return parts.pressure
        ? `${planet.name}'s ${atmo} atmosphere (game model) needs a pressure rating of ${need} atm. Your ${parts.pressure.name} is rated to ${parts.pressure.ratingAtm} atm, so the hull failed on the surface.`
        : `${planet.name}'s ${atmo} atmosphere (game model) needs a pressure rating of ${need} atm, and no pressure system was fitted. The crew compartment failed on the surface.`;
    }
    case 'landing-gear':
      return 'The payload had no lander legs, so the rocket could not touch down safely.';
    case 'ascent-twr':
      return `${planet.name}'s gravity is ${f2(planet.surfaceGravityG.value)} g. Your ascent thrust-to-weight was only ${f2(Number(c.actual))} (needs ${f2(req.minAscentTWR)}), so the rocket couldn't climb off the surface and was stranded.`;
    case 'life-support': {
      const p = parts.payload;
      return `${build.crew} astronaut${build.crew === 1 ? '' : 's'} needed ${req.lifeSupportDays} days of life support, but the ${p?.name ?? 'payload'} only provides ${p?.lifeSupportDays ?? 0}. The return journey had to be abandoned.`;
    }
    default:
      return c.detail;
  }
}

export function generateDebrief(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
  result: MissionResult,
  score: AttemptScore,
  ev: Evaluation = evaluateBuild(build, planet, difficulty),
): DebriefItem[] {
  const items: DebriefItem[] = [];
  const req = ev.requirements;
  const stats = buildStats(build, req);
  const budget = DIFFICULTY[difficulty].budget;
  const parts = installed(build);

  if (!result.success) {
    const failed = result.checks.find((c) => c.status === 'fail' && c.id !== 'total-dv');
    if (failed) items.push({ kind: 'cause', text: causeText(failed, build, planet, ev) });
  } else {
    const margin = (stats.deltaVKms / req.deltaVKms - 1) * 100;
    items.push({
      kind: 'good',
      text: `Your design delivered ${f2(stats.deltaVKms)} km/s of Δv against ${f2(req.deltaVKms)} km/s needed (${margin >= 0 ? '+' : ''}${Math.round(margin)}% margin), with ${Math.round(result.fuelRemainingFrac * 100)}% fuel left on landing back at Earth.`,
    });
  }

  // Δv picture when the failure was not about fuel.
  if (
    !result.success &&
    !(
      result.failedAt &&
      result.checks.some(
        (c) => c.status === 'fail' && (c.id.startsWith('fuel') || c.id === 'reentry'),
      )
    )
  ) {
    const enough = stats.deltaVKms >= req.deltaVKms;
    items.push({
      kind: enough ? 'good' : 'cause',
      text: enough
        ? `Your propulsion was sound: ${f2(stats.deltaVKms)} km/s of Δv covered the ${f2(req.deltaVKms)} km/s round trip.`
        : `Even past that point, fuel would have been short: ${f2(stats.deltaVKms)} km/s of Δv against ${f2(req.deltaVKms)} km/s needed.`,
    });
  }

  // Budget.
  const spendPct = Math.round((stats.cost / budget) * 100);
  if (stats.cost > budget) {
    items.push({
      kind: 'cause',
      text: `You spent ${stats.cost} of ${budget} credits (${spendPct}%). Going over budget cost you ${150 - score.budget} budget points.`,
    });
  } else if (spendPct < 50) {
    items.push({
      kind: result.success ? 'good' : 'cause',
      text: result.success
        ? `Lean engineering: the mission cost only ${stats.cost} of ${budget} credits (${spendPct}%).`
        : `You spent only ${stats.cost} of ${budget} credits (${spendPct}%). There was room in the budget for a more capable rocket.`,
    });
  }

  // Overkill / unsuitable selection.
  const overkill = selectionBreakdown(build, planet, difficulty).find(
    (s) => s.score > 0.2 && s.score < 1,
  );
  if (overkill) {
    const chosen = parts[overkill.part];
    items.push({
      kind: 'cause',
      text: `Your ${chosen?.name ?? overkill.part} was more than ${planet.name} needed. A cheaper option would do the same job and save credits and weight.`,
    });
  }

  // Crew.
  if (build.crew > 0) {
    items.push({
      kind: result.success ? 'good' : 'cause',
      text: result.success
        ? `Bringing ${build.crew} astronaut${build.crew === 1 ? '' : 's'} home safely multiplied your score by ×${score.crewMultiplier.toFixed(1)}.`
        : `With ${build.crew} astronaut${build.crew === 1 ? '' : 's'} on board, the failure cost an extra ${-score.crewAdjustment} points.`,
    });
  }

  // Tip.
  items.splice(4); // keep at most 4 explanations, plus the tip
  items.push({ kind: 'tip', text: tipText(build, planet, difficulty, result, score, ev) });
  return items;
}

function tipText(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
  result: MissionResult,
  score: AttemptScore,
  ev: Evaluation,
): string {
  if (!result.success) {
    const fixes = suggestFixes(build, planet, difficulty, 1);
    if (fixes.length) {
      const f = fixes[0];
      const delta =
        f.costDelta === 0
          ? 'at no extra cost'
          : f.costDelta > 0
            ? `for ${f.costDelta} more credits`
            : `and save ${-f.costDelta} credits`;
      return `Next time: ${f.description} ${delta}. That single change would have completed this mission.`;
    }
    const failed = result.checks.find((c) => c.status === 'fail' && c.id !== 'total-dv');
    const partial = failed ? suggestCheckFix(build, planet, difficulty, failed.id) : null;
    if (partial && failed) {
      const after = simulateMission(partial.build, planet, difficulty);
      const later = after.failedAt
        ? ` Even then, the next problem would come during ${STAGE_NAMES[after.failedAt]}, so plan for the whole round trip.`
        : '';
      return `Next time: ${partial.description} to get past this stage.${later}`;
    }
    if (failed?.id.startsWith('fuel') || failed?.id === 'reentry' || failed?.id === 'liftoff-twr') {
      return 'Next time: one change is not enough. Try a more efficient engine (higher Isp) together with more fuel, and keep the payload light. Every tonne you carry costs fuel on every leg.';
    }
    return 'Next time: re-read the mission brief and match each requirement before thinking about fuel.';
  }
  const fuelLeft = result.fuelRemainingFrac;
  if (fuelLeft > 0.3) {
    return `Next time: you came home with ${Math.round(fuelLeft * 100)}% fuel unused. A smaller tank would save weight and credits and raise your resource score.`;
  }
  if (score.selection < 140) {
    return 'Next time: pick the cheapest comms, pressure and protection parts that still meet the requirements. Over-engineering costs selection points.';
  }
  if (build.crew === 0 && DIFFICULTY[difficulty].maxCrew > 0) {
    return 'Next time: this design is reliable, so try adding astronauts for a score multiplier. A failure with crew costs points, though.';
  }
  void ev;
  return 'Next time: try a harder planet to push your engineering further.';
}
