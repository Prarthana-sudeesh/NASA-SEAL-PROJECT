// Rocket Builder tuning. All gameplay numbers live here.
import type { AtmosphereClass, Difficulty } from '../data/types.ts';

export type SlotKind = 'payload' | 'antenna' | 'body' | 'hull' | 'engine';
export const SLOT_ORDER: SlotKind[] = ['payload', 'antenna', 'body', 'hull', 'engine'];

interface BasePart {
  id: string;
  name: string;
  cost: number;
  blurb: string;
}
export interface PayloadPart extends BasePart {
  kind: 'payload';
  massT: number;
  seats: number;
}
export interface AntennaPart extends BasePart {
  kind: 'antenna';
  massT: number;
  /** Reaches planets closer than this many light-years. */
  rangeLy: number;
}
export interface BodyPart extends BasePart {
  kind: 'body';
  massT: number;
  /** Fuel tank capacity in tonnes. */
  capacityT: number;
  /** Number of pixel segments drawn for the body (also scales hull mass). */
  segments: number;
}
export interface HullPart extends BasePart {
  kind: 'hull';
  massPerSegmentT: number;
  maxK: number;
  /** Strongest pressure seal the hull can hold, in atm. */
  strengthAtm: number;
  color: string;
  dark: string;
}
export interface EnginePart extends BasePart {
  kind: 'engine';
  massT: number;
  /** Full-power thrust in kN. */
  thrustKN: number;
  /** Fuel efficiency: higher means less fuel needed. */
  efficiency: number;
}
export type Part = PayloadPart | AntennaPart | BodyPart | HullPart | EnginePart;

export const PAYLOADS: PayloadPart[] = [
  {
    id: 'payload-probe',
    kind: 'payload',
    name: 'Probe pod',
    cost: 50,
    massT: 2,
    seats: 0,
    blurb: 'Robot explorer, no crew',
  },
  {
    id: 'payload-capsule',
    kind: 'payload',
    name: 'Crew capsule',
    cost: 150,
    massT: 6,
    seats: 3,
    blurb: 'Carries up to 3 astronauts',
  },
];

export const ANTENNAS: AntennaPart[] = [
  {
    id: 'antenna-low',
    kind: 'antenna',
    name: 'Low-gain antenna',
    cost: 30,
    massT: 0.5,
    rangeLy: 15,
    blurb: 'Reaches under 15 light-years',
  },
  {
    id: 'antenna-high',
    kind: 'antenna',
    name: 'High-gain dish',
    cost: 70,
    massT: 1,
    rangeLy: 60,
    blurb: 'Reaches under 60 light-years',
  },
  {
    id: 'antenna-deep',
    kind: 'antenna',
    name: 'Deep-space relay',
    cost: 130,
    massT: 2,
    rangeLy: Infinity,
    blurb: 'Reaches any distance',
  },
];

export const BODIES: BodyPart[] = [
  {
    id: 'body-short',
    kind: 'body',
    name: 'Short fuel tank',
    cost: 60,
    massT: 3,
    capacityT: 40,
    segments: 2,
    blurb: '40 t of fuel, light',
  },
  {
    id: 'body-medium',
    kind: 'body',
    name: 'Medium fuel tank',
    cost: 110,
    massT: 6,
    capacityT: 80,
    segments: 3,
    blurb: '80 t of fuel',
  },
  {
    id: 'body-long',
    kind: 'body',
    name: 'Extra-long tank',
    cost: 180,
    massT: 10,
    capacityT: 140,
    segments: 5,
    blurb: '140 t of fuel, heavy',
  },
];

export const HULLS: HullPart[] = [
  {
    id: 'hull-aluminium',
    kind: 'hull',
    name: 'Aluminium',
    cost: 40,
    massPerSegmentT: 1,
    maxK: 450,
    strengthAtm: 3,
    color: '#cfd6e2',
    dark: '#8a96aa',
    blurb: 'Lightest. Melts above 450 K',
  },
  {
    id: 'hull-titanium',
    kind: 'hull',
    name: 'Titanium',
    cost: 140,
    massPerSegmentT: 1.8,
    maxK: 1000,
    strengthAtm: 6,
    color: '#9fb4c8',
    dark: '#5b6f86',
    blurb: 'Heat-resistant to 1,000 K',
  },
  {
    id: 'hull-steel',
    kind: 'hull',
    name: 'Stainless steel',
    cost: 90,
    massPerSegmentT: 3,
    maxK: 1300,
    strengthAtm: 12,
    color: '#7d8590',
    dark: '#474e58',
    blurb: 'Heavy, holds 12 atm',
  },
  {
    id: 'hull-carbon',
    kind: 'hull',
    name: 'Carbon-ceramic',
    cost: 220,
    massPerSegmentT: 2.2,
    maxK: 2500,
    strengthAtm: 4,
    color: '#3a3d45',
    dark: '#1d1f24',
    blurb: 'Survives up to 2,500 K',
  },
];

export const ENGINES: EnginePart[] = [
  {
    id: 'engine-small',
    kind: 'engine',
    name: 'Small thruster',
    cost: 90,
    massT: 3,
    thrustKN: 1500,
    efficiency: 1,
    blurb: 'Light and cheap',
  },
  {
    id: 'engine-big',
    kind: 'engine',
    name: 'Big thruster',
    cost: 180,
    massT: 6,
    thrustKN: 3200,
    efficiency: 0.9,
    blurb: 'Huge push, thirsty',
  },
  {
    id: 'engine-nuclear',
    kind: 'engine',
    name: 'Nuclear thruster',
    cost: 300,
    massT: 9,
    thrustKN: 3000,
    efficiency: 1.8,
    blurb: 'Needs much less fuel',
  },
];

export const ALL_PARTS: Part[] = [...PAYLOADS, ...ANTENNAS, ...BODIES, ...HULLS, ...ENGINES];
export const getPart = (id: string | null | undefined) => ALL_PARTS.find((p) => p.id === id);
export const partsOf = (kind: SlotKind) => ALL_PARTS.filter((p) => p.kind === kind);

export const SLOT_LABELS: Record<SlotKind, string> = {
  payload: 'Payload',
  antenna: 'Communication',
  body: 'Fuel tank (rocket length)',
  hull: 'Outer hull material',
  engine: 'Thruster',
};

export const ASTRONAUT_MASS_T = 0.3;

export const TUNING = {
  g0: 9.81,
  /** Required thrust-to-weight at Earth and on the planet. */
  minTWR: 1.2,
  /** Fuel needed = dry mass × (base + perLog10Ly·log10(ly) + perG·g) ÷ efficiency × thrust factor. */
  fuelBase: 1.0,
  fuelPerLog10Ly: 0.9,
  fuelPerG: 1.0,
  /** Running the engine harder burns more fuel: factor = min + slope × (thrust dial / 100). */
  thrustFactorMin: 0.75,
  thrustFactorSlope: 0.5,
  /** Fraction of the fuel still on board when taking off from the planet. */
  fuelLeftAtAscent: 0.3,
  /** Pressure dial range (atm). */
  pressureMax: 12,
  /** Spending more than budget × (1 + this) blocks launch. */
  maxOverspend: 0.15,
} as const;

/** Outside pressure the seal must hold back, by atmosphere class (GAME MODEL). */
export const OUTSIDE_PRESSURE: Record<AtmosphereClass, number> = {
  thin: 0,
  earthlike: 1,
  frozen: 1.5,
  scorching: 3,
  thick: 8,
};

export type { Difficulty };
export type HintLevel = 'zones' | 'tips' | 'none';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  budget: number;
  hints: HintLevel;
  maxCrew: number;
  planets: string[];
  summary: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    budget: 500,
    hints: 'zones',
    maxCrew: 1,
    planets: ['proxima-cen-b', 'teegardens-star-b', 'ross-128-b', 'gj-1061-d', 'gj-1002-b'],
    summary: 'Nearby, mild worlds. The dials show you the safe zone.',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    budget: 600,
    hints: 'tips',
    maxCrew: 2,
    planets: ['trappist-1-e', 'trappist-1-f', 'gliese-12-b', 'lhs-1140-c', 'gj-3323-c'],
    summary: 'Further away, colder and warmer worlds. The scientist gives tips.',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    budget: 900,
    hints: 'none',
    maxCrew: 3,
    planets: ['lhs-1140-b', '55-cnc-e', 'kepler-22-b', 'k2-18-b', 'kepler-10-b'],
    summary: 'Lava worlds, heavy gravity and crushing air. No hints.',
  },
};

export const ATTEMPTS_PER_RUN = 10;

export const SCORING = {
  mission: 400,
  perStageOnFail: 50,
  budget: 150,
  fuel: 100,
  thrust: 100,
  pressure: 100,
  parts: 150,
  quiz: 50,
  crewBonus: 0.1,
  crewPenalty: 60,
} as const;
