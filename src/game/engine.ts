// Rocket Builder game engine. Pure functions, no React.
import type { Planet } from '../data/types.ts';
import {
  ANTENNAS,
  ASTRONAUT_MASS_T,
  DIFFICULTIES,
  HULLS,
  OUTSIDE_PRESSURE,
  SCORING,
  SLOT_ORDER,
  TUNING,
  getPart,
  type AntennaPart,
  type BodyPart,
  type Difficulty,
  type EnginePart,
  type HullPart,
  type PayloadPart,
  type SlotKind,
} from './config.ts';

export type Build = Record<SlotKind, string | null> & { crew: number };

/** Dials: fuel and thrust in % (0–100), pressure seal in atm. */
export interface Dials {
  fuel: number;
  thrust: number;
  pressure: number;
}

export const EMPTY_BUILD: Build = {
  payload: null,
  antenna: null,
  body: null,
  hull: null,
  engine: null,
  crew: 0,
};
export const DEFAULT_DIALS: Dials = { fuel: 50, thrust: 50, pressure: 1 };

export type Stage = 'launch' | 'journey' | 'approach' | 'landing' | 'ascent' | 'return';
export const STAGES: Stage[] = ['launch', 'journey', 'approach', 'landing', 'ascent', 'return'];
export const STAGE_LABELS: Record<Stage, string> = {
  launch: 'Launch',
  journey: 'Journey',
  approach: 'Approach',
  landing: 'Landing',
  ascent: 'Take-off from planet',
  return: 'Return to Earth',
};

export interface Parts {
  payload: PayloadPart;
  antenna: AntennaPart;
  body: BodyPart;
  hull: HullPart;
  engine: EnginePart;
}

export function parts(build: Build): Parts | null {
  const got = SLOT_ORDER.map((k) => getPart(build[k]));
  if (got.some((p) => !p)) return null;
  const [payload, antenna, body, hull, engine] = got as [
    PayloadPart,
    AntennaPart,
    BodyPart,
    HullPart,
    EnginePart,
  ];
  return { payload, antenna, body, hull, engine };
}

export function buildCost(build: Build): number {
  return SLOT_ORDER.reduce((s, k) => s + (getPart(build[k])?.cost ?? 0), 0);
}

export function missingSlots(build: Build): SlotKind[] {
  return SLOT_ORDER.filter((k) => !build[k]);
}

/** Reasons the rocket cannot launch at all. */
export function launchBlocks(build: Build, difficulty: Difficulty): string[] {
  const out: string[] = [];
  const missing = missingSlots(build);
  if (missing.length) out.push(`Still missing: ${missing.join(', ')}.`);
  const seats = (getPart(build.payload) as PayloadPart | undefined)?.seats ?? 0;
  if (build.crew > seats) out.push('Astronauts need a crew capsule.');
  const budget = DIFFICULTIES[difficulty].budget;
  if (buildCost(build) > budget * (1 + TUNING.maxOverspend))
    out.push(`Cost is more than 15% over the ${budget}-credit budget.`);
  return out;
}

export function dryMass(p: Parts, crew: number): number {
  return (
    p.payload.massT +
    crew * ASTRONAUT_MASS_T +
    p.antenna.massT +
    p.body.massT +
    p.hull.massPerSegmentT * p.body.segments +
    p.engine.massT
  );
}

export function fuelLoad(p: Parts, dials: Dials): number {
  return (p.body.capacityT * dials.fuel) / 100;
}

export function outsidePressure(planet: Planet): number {
  return OUTSIDE_PRESSURE[planet.atmosphere.value];
}

/** Seal must hold at least 1 atm for the crew and at least the outside pressure. */
export function requiredSeal(planet: Planet): number {
  return Math.max(1, outsidePressure(planet));
}

export function fuelNeeded(p: Parts, crew: number, dials: Dials, planet: Planet): number {
  const t = TUNING;
  const k =
    t.fuelBase +
    t.fuelPerLog10Ly * Math.log10(Math.max(1, planet.distanceLy.value)) +
    t.fuelPerG * planet.surfaceGravityG.value;
  const thrustFactor = t.thrustFactorMin + t.thrustFactorSlope * (dials.thrust / 100);
  return (dryMass(p, crew) * k * thrustFactor) / p.engine.efficiency;
}

export function twrEarth(p: Parts, crew: number, dials: Dials): number {
  const thrust = (p.engine.thrustKN * dials.thrust) / 100;
  return thrust / ((dryMass(p, crew) + fuelLoad(p, dials)) * TUNING.g0);
}

export function twrPlanet(p: Parts, crew: number, dials: Dials, planet: Planet): number {
  const thrust = (p.engine.thrustKN * dials.thrust) / 100;
  const mass = dryMass(p, crew) + fuelLoad(p, dials) * TUNING.fuelLeftAtAscent;
  return thrust / (mass * TUNING.g0 * planet.surfaceGravityG.value);
}

export type CheckId =
  'twr-earth' | 'comms' | 'fuel' | 'heat' | 'pressure-low' | 'pressure-high' | 'twr-planet';

export interface Check {
  id: CheckId;
  stage: Stage;
  ok: boolean;
  label: string;
  actual: string;
  needed: string;
}

export function checks(build: Build, dials: Dials, planet: Planet): Check[] {
  const p = parts(build);
  if (!p) return [];
  const crew = build.crew;
  const T = planet.eqTempK.value;
  const ly = planet.distanceLy.value;
  const seal = requiredSeal(planet);
  const need = fuelNeeded(p, crew, dials, planet);
  const have = fuelLoad(p, dials);
  const te = twrEarth(p, crew, dials);
  const tp = twrPlanet(p, crew, dials, planet);
  const f1 = (n: number) => n.toFixed(1);
  const f2 = (n: number) => n.toFixed(2);
  return [
    {
      id: 'twr-earth',
      stage: 'launch',
      ok: te >= TUNING.minTWR,
      label: 'Thrust to leave Earth',
      actual: `${f2(te)}× weight`,
      needed: `≥ ${TUNING.minTWR}×`,
    },
    {
      id: 'comms',
      stage: 'journey',
      ok: ly < p.antenna.rangeLy,
      label: 'Radio contact with Earth',
      actual: Number.isFinite(p.antenna.rangeLy) ? `< ${p.antenna.rangeLy} ly` : 'any distance',
      needed: `${f1(ly)} ly`,
    },
    {
      id: 'fuel',
      stage: 'journey',
      ok: have >= need,
      label: 'Fuel for the round trip',
      actual: `${f1(have)} t`,
      needed: `≥ ${f1(need)} t`,
    },
    {
      id: 'heat',
      stage: 'approach',
      ok: T <= p.hull.maxK,
      label: 'Hull heat limit',
      actual: `${p.hull.maxK} K`,
      needed: `≥ ${Math.round(T)} K`,
    },
    {
      id: 'pressure-low',
      stage: 'landing',
      ok: dials.pressure >= seal,
      label: 'Pressure seal',
      actual: `${dials.pressure} atm`,
      needed: `≥ ${seal} atm`,
    },
    {
      id: 'pressure-high',
      stage: 'landing',
      ok: dials.pressure <= p.hull.strengthAtm,
      label: 'Hull strength',
      actual: `${dials.pressure} atm`,
      needed: `≤ ${p.hull.strengthAtm} atm`,
    },
    {
      id: 'twr-planet',
      stage: 'ascent',
      ok: tp >= TUNING.minTWR,
      label: `Thrust in ${f2(planet.surfaceGravityG.value)} g`,
      actual: `${f2(tp)}× weight`,
      needed: `≥ ${TUNING.minTWR}×`,
    },
  ];
}

export interface Zones {
  fuel: readonly [number, number] | null;
  thrust: readonly [number, number] | null;
  pressure: readonly [number, number] | null;
}

/** Range of dial values for which a matching setting of the other dial exists (for hints). */
export function dialZones(build: Build, _dials: Dials, planet: Planet): Zones | null {
  const p = parts(build);
  if (!p) return null;
  const c = build.crew;
  const works = (fuel: number, thrust: number) => {
    const x = { fuel, thrust, pressure: 0 };
    return (
      twrEarth(p, c, x) >= TUNING.minTWR &&
      twrPlanet(p, c, x, planet) >= TUNING.minTWR &&
      fuelLoad(p, x) >= fuelNeeded(p, c, x, planet)
    );
  };
  const range = (ok: (v: number) => boolean): readonly [number, number] | null => {
    let lo: number | null = null;
    let hi: number | null = null;
    for (let v = 0; v <= 100; v++) {
      if (ok(v)) {
        lo ??= v;
        hi = v;
      }
    }
    return lo !== null && hi !== null ? [lo, hi] : null;
  };
  const seal = requiredSeal(planet);
  return {
    fuel: range((f) => {
      for (let t = 0; t <= 100; t += 2) if (works(f, t)) return true;
      return false;
    }),
    thrust: range((t) => {
      for (let f = 0; f <= 100; f += 2) if (works(f, t)) return true;
      return false;
    }),
    pressure: seal <= p.hull.strengthAtm ? [seal, p.hull.strengthAtm] : null,
  };
}

/** Lowest thrust that can work with the current fuel (used to score the thrust dial). */
export function minWorkingThrust(build: Build, dials: Dials, planet: Planet): number | null {
  const p = parts(build);
  if (!p) return null;
  for (let t = 0; t <= 100; t++) {
    const x = { ...dials, thrust: t };
    if (
      twrEarth(p, build.crew, x) >= TUNING.minTWR &&
      twrPlanet(p, build.crew, x, planet) >= TUNING.minTWR
    )
      return t;
  }
  return null;
}

/** Best dial settings for a build, or null if no setting works. */
export function bestDials(build: Build, planet: Planet): Dials | null {
  const p = parts(build);
  if (!p) return null;
  const pressure = requiredSeal(planet);
  for (let thrust = 0; thrust <= 100; thrust += 1) {
    for (let fuel = 0; fuel <= 100; fuel += 1) {
      const d = { fuel, thrust, pressure };
      if (checks(build, d, planet).every((ch) => ch.ok)) return d;
    }
  }
  return null;
}

export interface Result {
  success: boolean;
  failedAt: Stage | null;
  stagesCleared: number;
  checks: Check[];
  cost: number;
  base: number;
  crewAdjustment: number;
  total: number;
  breakdown: { label: string; points: number; max: number }[];
  explanation: string[];
}

const closeness = (value: number, ideal: number, tolerance: number) =>
  Math.max(0, 1 - Math.abs(value - ideal) / tolerance);

export function budgetPoints(cost: number, budget: number): number {
  if (cost <= budget) return SCORING.budget;
  const over = (cost - budget) / budget;
  return Math.round(SCORING.budget * Math.max(0, 1 - over / TUNING.maxOverspend));
}

export function crewAdjust(base: number, crew: number, success: boolean) {
  if (success) {
    const total = Math.round(base * (1 + SCORING.crewBonus * crew));
    return { total, adjustment: total - base };
  }
  const total = Math.max(0, base - SCORING.crewPenalty * crew);
  return { total, adjustment: total - base };
}

const HULLS_BY_COST = [...HULLS].sort((a, b) => a.cost - b.cost);
const ANTENNAS_BY_COST = [...ANTENNAS].sort((a, b) => a.cost - b.cost);

export function simulate(
  build: Build,
  dials: Dials,
  planet: Planet,
  difficulty: Difficulty,
  quizCorrect: boolean | null = null,
): Result {
  const cs = checks(build, dials, planet);
  const failed = cs.find((c) => !c.ok);
  const p = parts(build);
  const cost = buildCost(build);
  if (!p) {
    return {
      success: false,
      failedAt: 'launch',
      stagesCleared: 0,
      checks: cs,
      cost,
      base: 0,
      crewAdjustment: 0,
      total: 0,
      breakdown: [],
      explanation: ['The rocket is not finished.'],
    };
  }
  const success = !failed;
  const failedAt = failed ? failed.stage : null;
  const stagesCleared = failedAt ? STAGES.indexOf(failedAt) : STAGES.length;
  const scale = success ? 1 : 1 / 3;

  const need = fuelNeeded(p, build.crew, dials, planet);
  const fuelPct = (fuelLoad(p, dials) / need) * 100;
  const minThrust = minWorkingThrust(build, dials, planet);
  const thrustIdeal = minThrust !== null ? minThrust + 8 : 100;
  const T = planet.eqTempK.value;
  const seal = requiredSeal(planet);
  const bestHull = HULLS_BY_COST.find((h) => h.maxK >= T && h.strengthAtm >= seal);
  const bestAntenna = ANTENNAS_BY_COST.find((a) => planet.distanceLy.value < a.rangeLy);
  const partScore =
    (p.hull.id === bestHull?.id ? 75 : T <= p.hull.maxK && seal <= p.hull.strengthAtm ? 35 : 0) +
    (p.antenna.id === bestAntenna?.id ? 75 : planet.distanceLy.value < p.antenna.rangeLy ? 35 : 0);

  const breakdown = [
    {
      label: 'Mission',
      points: success ? SCORING.mission : stagesCleared * SCORING.perStageOnFail,
      max: SCORING.mission,
    },
    {
      label: 'Budget',
      points: budgetPoints(cost, DIFFICULTIES[difficulty].budget),
      max: SCORING.budget,
    },
    {
      label: 'Fuel dial',
      points: Math.round(SCORING.fuel * closeness(fuelPct, 112, 40) * scale),
      max: SCORING.fuel,
    },
    {
      label: 'Thrust dial',
      points: Math.round(SCORING.thrust * closeness(dials.thrust, thrustIdeal, 40) * scale),
      max: SCORING.thrust,
    },
    {
      label: 'Pressure dial',
      points: Math.round(SCORING.pressure * closeness(dials.pressure, seal, 4) * scale),
      max: SCORING.pressure,
    },
    {
      label: 'Part choice',
      points: Math.round(partScore * (success ? 1 : 0.5)),
      max: SCORING.parts,
    },
    { label: 'Science quiz', points: quizCorrect ? SCORING.quiz : 0, max: SCORING.quiz },
  ];
  const base = breakdown.reduce((s, b) => s + b.points, 0);
  const crew = crewAdjust(base, build.crew, success);
  return {
    success,
    failedAt,
    stagesCleared,
    checks: cs,
    cost,
    base,
    crewAdjustment: crew.adjustment,
    total: crew.total,
    breakdown,
    explanation: explain(cs, p, build, planet, success),
  };
}

function explain(cs: Check[], p: Parts, build: Build, planet: Planet, success: boolean): string[] {
  const crewLine =
    build.crew > 0
      ? success
        ? `Your ${build.crew} astronaut${build.crew > 1 ? 's' : ''} came home safely: score × ${(1 + SCORING.crewBonus * build.crew).toFixed(1)}.`
        : `${build.crew} astronaut${build.crew > 1 ? 's were' : ' was'} on board: −${SCORING.crewPenalty * build.crew} points.`
      : null;
  const lines: string[] = [];
  if (success) {
    lines.push(
      `Mission complete! Your ${p.hull.name.toLowerCase()} rocket reached ${planet.name} and came back.`,
    );
    lines.push(
      'Tip: settings close to the minimum that works score the most. Extra fuel and thrust only add weight.',
    );
  } else {
    const f = cs.find((c) => !c.ok)!;
    const T = Math.round(planet.eqTempK.value);
    const g = planet.surfaceGravityG.value.toFixed(2);
    const ly = planet.distanceLy.value;
    const map: Record<CheckId, string[]> = {
      'twr-earth': [
        `The rocket was too heavy to lift off: thrust was only ${f.actual} its weight (needs ${f.needed}).`,
        'Turn the thrust dial up, carry less fuel, or choose a bigger thruster.',
      ],
      comms: [
        `${planet.name} is ${ly} light-years away, but your ${p.antenna.name.toLowerCase()} only reaches ${f.actual}. Contact was lost and the rocket drifted off course.`,
        'Pick a communication part with a longer range.',
      ],
      fuel: [
        `You ran out of fuel: you loaded ${f.actual} but the round trip (${ly} light-years, ${g} g gravity) needed ${f.needed.replace('≥ ', '')}.`,
        'Fill the tank more, use a longer tank, or switch to the nuclear thruster. Lower thrust also saves fuel.',
      ],
      heat: [
        `${planet.name} is about ${T} K. ${p.hull.name} only survives up to ${p.hull.maxK} K, so the hull burned up on approach.`,
        'Choose a hull material with a higher heat limit.',
      ],
      'pressure-low': [
        `The pressure seal was ${f.actual}, but ${planet.name} needs ${f.needed}. The cabin was crushed on landing.`,
        'Set the pressure dial to at least the outside pressure, and never below 1 atm for the crew.',
      ],
      'pressure-high': [
        `The seal was set to ${f.actual}, more than ${p.hull.name} can hold (${p.hull.strengthAtm} atm). The hull burst on landing.`,
        'Lower the pressure dial, or use a stronger hull like stainless steel.',
      ],
      'twr-planet': [
        `${planet.name}'s gravity is ${g} g. Your thrust was only ${f.actual} the rocket's weight there, so it was stranded.`,
        'Turn the thrust up, choose a bigger thruster, or make the rocket lighter.',
      ],
    };
    lines.push(...map[f.id]);
  }
  if (crewLine) lines.push(crewLine);
  return lines;
}

// ---------- Science quiz ----------

export interface QuizQuestion {
  id: 'heat' | 'comms' | 'pressure' | 'gravity' | 'engine';
  question: string;
  options: string[];
  answer: number;
  explain: string;
}

const HULLS_BY_MASS = [...HULLS].sort((a, b) => a.massPerSegmentT - b.massPerSegmentT);

/** One question about the chosen planet, varied by mission number. */
export function quizFor(planet: Planet, missionNumber: number): QuizQuestion {
  const T = Math.round(planet.eqTempK.value);
  const ly = planet.distanceLy.value;
  const g = planet.surfaceGravityG.value;
  const seal = requiredSeal(planet);
  const out = outsidePressure(planet);
  const bank: QuizQuestion[] = [];

  const lightest = HULLS_BY_MASS.find((h) => h.maxK >= T)!;
  bank.push({
    id: 'heat',
    question: `${planet.name} is about ${T} K. Which is the LIGHTEST hull material that won't melt there?`,
    options: HULLS_BY_MASS.map((h) => `${h.name} (up to ${h.maxK.toLocaleString()} K)`),
    answer: HULLS_BY_MASS.indexOf(lightest),
    explain: `${lightest.name} survives up to ${lightest.maxK.toLocaleString()} K, and it's the lightest one that does. Lighter hulls need less fuel.`,
  });

  const byCost = [...ANTENNAS].sort((a, b) => a.cost - b.cost);
  const ant = byCost.find((a) => ly < a.rangeLy)!;
  bank.push({
    id: 'comms',
    question: `${planet.name} is ${ly} light-years from Earth. Which is the CHEAPEST antenna that can still reach mission control?`,
    options: byCost.map(
      (a) => `${a.name} (${Number.isFinite(a.rangeLy) ? `under ${a.rangeLy} ly` : 'any distance'})`,
    ),
    answer: byCost.indexOf(ant),
    explain: `${ant.name} is the cheapest one with enough range for ${ly} light-years.`,
  });

  const choices = [...new Set([0, 1, seal, seal + 4, 12].filter((v) => v <= TUNING.pressureMax))]
    .sort((a, b) => a - b)
    .slice(0, 4);
  bank.push({
    id: 'pressure',
    question: `Outside pressure on ${planet.name} is about ${out} atm (game model). What is the LOWEST safe setting for the pressure seal?`,
    options: choices.map((c) => `${c} atm`),
    answer: choices.indexOf(seal),
    explain:
      out < 1
        ? 'The crew always needs at least 1 atm, even when there is almost no air outside.'
        : `The seal must hold back the ${out} atm outside, so set it to at least ${seal} atm (and no more than your hull can take).`,
  });

  const gAnswer = g > 1.1 ? 2 : g < 0.9 ? 0 : 1;
  bank.push({
    id: 'gravity',
    question: `Gravity on ${planet.name} is ${g} g. For a rocket of the same weight, taking off from there needs…`,
    options: [
      'Less thrust than on Earth',
      'About the same thrust as on Earth',
      'More thrust than on Earth',
    ],
    answer: gAnswer,
    explain: `Weight = mass × gravity. At ${g} g the rocket weighs ${g > 1 ? 'more' : g < 1 ? 'less' : 'about the same'} than on Earth, so it needs ${['less', 'about the same', 'more'][gAnswer]} thrust.`,
  });

  bank.push({
    id: 'engine',
    question: 'Which thruster would use the LEAST fuel for this round trip?',
    options: ['Small thruster', 'Big thruster', 'Nuclear thruster'],
    answer: 2,
    explain:
      'The nuclear thruster is about twice as fuel-efficient (×1.8 economy), but it is heavy and expensive.',
  });

  // Put the most relevant question for this planet first.
  const order: QuizQuestion['id'][] =
    T > 450
      ? ['heat', 'pressure', 'gravity', 'comms', 'engine']
      : out >= 3
        ? ['pressure', 'gravity', 'heat', 'comms', 'engine']
        : ly >= 15
          ? ['comms', 'gravity', 'pressure', 'heat', 'engine']
          : ['gravity', 'heat', 'pressure', 'comms', 'engine'];
  const sorted = order.map((id) => bank.find((q) => q.id === id)!);
  return sorted[(Math.max(1, missionNumber) - 1) % sorted.length];
}
