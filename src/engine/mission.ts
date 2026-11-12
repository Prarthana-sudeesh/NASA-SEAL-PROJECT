// Mission engine: evaluates every requirement check and walks the stages in order,
// stopping at the first failure. Pure and deterministic.
import { DIFFICULTY } from '../config/difficulty.ts';
import { ASTRONAUT_MASS_T } from '../config/components.ts';
import { PRESSURE_BY_ATMOSPHERE, WARN_MARGIN } from '../config/physics.ts';
import type {
  CheckId,
  CheckResult,
  CheckStatus,
  DeltaVLeg,
  Difficulty,
  MissionRequirements,
  MissionResult,
  MissionStage,
  Planet,
  RocketBuild,
} from '../data/types.ts';
import { MISSION_STAGES } from '../data/types.ts';
import { bestIsp, buildStats, installed, liftIsp, liftThrusters } from './build.ts';
import { propellantFor, thrustToWeight } from './physics.ts';
import { missionRequirements } from './requirements.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;

function marginStatus(actual: number, required: number): CheckStatus {
  if (actual < required) return 'fail';
  return required > 0 && actual < required * (1 + WARN_MARGIN) ? 'warn' : 'pass';
}

const LEG_CHECK: Record<DeltaVLeg['leg'], CheckId> = {
  earthLaunch: 'fuel-launch',
  transitOut: 'fuel-transit',
  landing: 'fuel-landing',
  ascent: 'fuel-ascent',
  transitBack: 'fuel-return',
  earthReturn: 'reentry',
};

const LEG_LABEL: Record<DeltaVLeg['leg'], string> = {
  earthLaunch: 'Fuel for Earth launch',
  transitOut: 'Fuel for outbound transit',
  landing: 'Fuel for landing',
  ascent: 'Fuel for ascent',
  transitBack: 'Fuel for return transit',
  earthReturn: 'Fuel for Earth re-entry burn',
};

export interface FuelLegResult {
  leg: DeltaVLeg;
  needT: number;
  haveT: number;
  isp: number;
  massBeforeT: number;
}

export interface Evaluation {
  requirements: MissionRequirements;
  checks: CheckResult[];
  fuelLegs: FuelLegResult[];
  /** Fuel left at the end if every burn were completed (can be negative). */
  projectedFuelLeftT: number;
  fuelCapacityT: number;
  massAtAscentT: number;
}

/** Evaluate every check for a build without stopping. Used by pre-launch review and mission sim. */
export function evaluateBuild(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
): Evaluation {
  const cfg = DIFFICULTY[difficulty];
  const req = missionRequirements(planet, difficulty);
  const parts = installed(build);
  const stats = buildStats(build, req);
  const inPlay = new Set(cfg.checksInPlay);
  const checks: CheckResult[] = [];
  const push = (c: CheckResult) => {
    if (inPlay.has(c.id)) checks.push(c);
  };

  // --- Launch: thrust-to-weight
  push({
    id: 'liftoff-twr',
    stage: 'launch',
    label: 'Lift-off thrust-to-weight',
    status: marginStatus(stats.liftoffTWR, req.minLiftoffTWR),
    actual: stats.liftoffTWR,
    required: req.minLiftoffTWR,
    detail:
      liftThrusters(parts).length === 0
        ? parts.thrusters.length > 0
          ? 'Ion engines are too weak to lift off. Add a chemical or nuclear booster.'
          : 'No thruster fitted.'
        : `${stats.liftoffThrustKN.toLocaleString()} kN pushing ${stats.wetMassT} t.`,
  });

  // --- Fuel per leg (sequential burns)
  const lift = liftIsp(parts);
  const best = bestIsp(parts);
  let mass = stats.wetMassT;
  let fuel = stats.fuelT;
  let massAtAscent = mass;
  const fuelLegs: FuelLegResult[] = [];
  for (const leg of req.legs) {
    const isp = leg.highThrust ? lift : best;
    if (leg.leg === 'ascent') massAtAscent = mass;
    const need = isp > 0 ? propellantFor(leg.deltaVKms, isp, mass) : Number.POSITIVE_INFINITY;
    const have = Math.max(fuel, 0);
    fuelLegs.push({ leg, needT: need, haveT: have, isp, massBeforeT: mass });
    const status: CheckStatus =
      need > have ? 'fail' : have - need < stats.fuelT * WARN_MARGIN * 0.5 ? 'warn' : 'pass';
    push({
      id: LEG_CHECK[leg.leg],
      stage: leg.stage,
      label: LEG_LABEL[leg.leg],
      status,
      actual: Number.isFinite(need) ? r2(have) : 0,
      required: Number.isFinite(need) ? r2(need) : 'no engine',
      unit: 't',
      detail: `${r2(leg.deltaVKms)} km/s burn at Isp ${Math.round(isp)} s.`,
    });
    if (Number.isFinite(need)) {
      const burned = Math.min(need, Math.max(fuel, 0));
      mass -= burned;
      fuel -= need;
    } else {
      fuel = Number.NEGATIVE_INFINITY;
    }
  }

  // --- Total Δv (summary, informational)
  push({
    id: 'total-dv',
    stage: 'orbit',
    label: 'Round-trip Δv',
    status: marginStatus(stats.deltaVKms, req.deltaVKms),
    actual: stats.deltaVKms,
    required: req.deltaVKms,
    unit: 'km/s',
    detail: 'Total change in velocity for Earth → planet → Earth.',
  });

  // --- Transit: comms range
  const commsTier = parts.comms?.rangeTier ?? 0;
  push({
    id: 'comms',
    stage: 'transit',
    label: 'Communication range',
    status: commsTier >= req.commsTier ? 'pass' : 'fail',
    actual: commsTier === 0 ? 'none' : `tier ${commsTier}`,
    required: `tier ${req.commsTier}`,
    detail: parts.comms
      ? `${parts.comms.name} reaches tier ${commsTier}.`
      : 'No communication system fitted.',
  });

  // --- Approach: protection
  const T = planet.eqTempK.value;
  const prot = parts.protection;
  push({
    id: 'protection',
    stage: 'approach',
    label: 'Heat / environment protection',
    status: prot && T >= prot.minK && T <= prot.maxK ? 'pass' : 'fail',
    actual: prot ? `${prot.minK}–${prot.maxK} K` : 'none',
    required: `${Math.round(T)} K`,
    detail: prot
      ? `${prot.name} protects from ${prot.minK} to ${prot.maxK} K.`
      : 'No protection fitted.',
  });

  // --- Landing: lander legs
  push({
    id: 'landing-gear',
    stage: 'landing',
    label: 'Landing gear',
    status: parts.payload?.landerLegs ? 'pass' : 'fail',
    actual: parts.payload?.landerLegs ? 'yes' : 'no',
    required: 'yes',
    detail: parts.payload ? `${parts.payload.name} has lander legs.` : 'No payload fitted.',
  });

  // --- Surface: pressure
  const needAtm = PRESSURE_BY_ATMOSPHERE[planet.atmosphere.value];
  const pressure = parts.pressure;
  const pressureOk =
    !!pressure && pressure.ratingAtm >= needAtm && (build.crew === 0 || pressure.crewRated);
  push({
    id: 'pressure',
    stage: 'surface',
    label: 'Pressure rating',
    status: pressureOk ? 'pass' : 'fail',
    actual: pressure ? pressure.ratingAtm : 0,
    required: needAtm,
    unit: 'atm',
    detail: pressure
      ? `${pressure.name} is rated to ${pressure.ratingAtm} atm${pressure.crewRated ? ' and crew-rated' : ''}.`
      : 'No pressure system fitted.',
  });

  // --- Ascent: thrust-to-weight in the planet's gravity
  const g = planet.surfaceGravityG.value;
  const liftThrust = liftThrusters(parts).reduce((s, t) => s + t.thrustKN, 0);
  const ascentTWR = r2(thrustToWeight(liftThrust, massAtAscent, g));
  push({
    id: 'ascent-twr',
    stage: 'ascent',
    label: `Ascent thrust-to-weight (${r2(g)} g)`,
    status: marginStatus(ascentTWR, req.minAscentTWR),
    actual: ascentTWR,
    required: req.minAscentTWR,
    detail: `${liftThrust.toLocaleString()} kN lifting ${r2(massAtAscent)} t in ${r2(g)} g.`,
  });

  // --- Return: life support (crewed missions)
  const lsNeed = req.lifeSupportDays ?? 0;
  const lsHave = parts.payload?.lifeSupportDays ?? 0;
  push({
    id: 'life-support',
    stage: 'return',
    label: 'Crew life support',
    status: build.crew === 0 ? 'pass' : lsHave >= lsNeed ? 'pass' : 'fail',
    actual: build.crew === 0 ? 'no crew' : lsHave,
    required: build.crew === 0 ? 'n/a' : lsNeed,
    unit: build.crew === 0 ? undefined : 'days',
    detail:
      build.crew === 0
        ? 'Uncrewed mission: no life support needed.'
        : `${build.crew} crew for a ${lsNeed}-day mission (game days).`,
  });

  // Stage order, keeping evaluation order within a stage.
  checks.sort((a, b) => MISSION_STAGES.indexOf(a.stage) - MISSION_STAGES.indexOf(b.stage));
  return {
    requirements: req,
    checks,
    fuelLegs,
    projectedFuelLeftT: fuel,
    fuelCapacityT: stats.fuelT,
    massAtAscentT: massAtAscent,
  };
}

/** Checks that stop the mission when failed ('total-dv' is a summary; the leg checks decide). */
const NON_BLOCKING: CheckId[] = ['total-dv'];

export function simulateMission(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
): MissionResult {
  const ev = evaluateBuild(build, planet, difficulty);
  const executed: CheckResult[] = [];
  let failedAt: MissionStage | null = null;
  for (const stage of MISSION_STAGES) {
    const stageChecks = ev.checks.filter((c) => c.stage === stage);
    executed.push(...stageChecks);
    if (stageChecks.some((c) => c.status === 'fail' && !NON_BLOCKING.includes(c.id))) {
      failedAt = stage;
      break;
    }
  }
  const stagesCleared = failedAt ? MISSION_STAGES.indexOf(failedAt) : MISSION_STAGES.length;
  const cap = ev.fuelCapacityT || 1;

  // Fuel remaining after each stage (for the gauge).
  const fuelTimeline: MissionResult['fuelTimeline'] = [];
  let fuel = ev.fuelCapacityT;
  for (const stage of MISSION_STAGES) {
    for (const fl of ev.fuelLegs.filter((l) => l.leg.stage === stage)) {
      fuel -= Number.isFinite(fl.needT) ? fl.needT : fuel;
    }
    fuelTimeline.push({ stage, fuelFrac: Math.max(0, fuel) / cap });
  }

  const needAtm = PRESSURE_BY_ATMOSPHERE[planet.atmosphere.value];
  const rating = installed(build).pressure?.ratingAtm ?? 0;
  const pressureInPlay = DIFFICULTY[difficulty].checksInPlay.includes('pressure');
  const pressureTimeline = MISSION_STAGES.map((stage) => {
    const atPlanet = stage === 'landing' || stage === 'surface' || stage === 'ascent';
    const atm = atPlanet ? needAtm : stage === 'launch' || stage === 'reentry' ? 1 : 0;
    const ok = !pressureInPlay || !atPlanet || rating >= needAtm;
    return { stage, atm, ok };
  });

  const success = failedAt === null;
  const lastFuel = success
    ? Math.max(0, ev.projectedFuelLeftT) / cap
    : (fuelTimeline[Math.max(0, stagesCleared - 1)]?.fuelFrac ?? 1);
  return {
    success,
    stageReached: failedAt ?? 'reentry',
    failedAt,
    stagesCleared,
    checks: executed,
    fuelTimeline,
    pressureTimeline,
    fuelRemainingFrac: Math.round(lastFuel * 1000) / 1000,
  };
}

/** Mass of astronauts (exported for debrief messages). */
export const crewMass = (crew: number) => crew * ASTRONAUT_MASS_T;
