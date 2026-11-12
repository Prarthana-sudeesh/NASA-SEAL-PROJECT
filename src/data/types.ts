// Shared data models for Rocket Builder. Framework-free: imported by engine, scripts and UI.

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export type ModuleType = 'payload' | 'comms' | 'pressure' | 'fuel' | 'thruster' | 'protection';
export const MODULE_TYPES: readonly ModuleType[] = [
  'payload',
  'comms',
  'pressure',
  'fuel',
  'thruster',
  'protection',
];

export type AtmosphereClass = 'thin' | 'earthlike' | 'thick' | 'scorching' | 'frozen';

/** 'nasa' = real catalogue value; 'model' = simplified gameplay assumption or derived value. */
export type Provenance = 'nasa' | 'model';

export interface Sourced<T> {
  value: T;
  source: Provenance;
}

export interface Planet {
  id: string;
  name: string;
  host: string;
  difficulty: Difficulty;
  description: string;
  distanceLy: Sourced<number>;
  radiusEarth: Sourced<number>;
  massEarth: Sourced<number>;
  eqTempK: Sourced<number>;
  orbitalPeriodDays: Sourced<number | null>;
  discoveryYear: Sourced<number>;
  discoveryMethod: Sourced<string>;
  starSpectralType: Sourced<string | null>;
  starTeffK: Sourced<number | null>;
  surfaceGravityG: Sourced<number>;
  escapeVelocityKms: Sourced<number>;
  atmosphere: Sourced<AtmosphereClass>;
}

export interface PlanetSnapshot {
  source: string;
  sourceUrl: string;
  table: string;
  retrievedAt: string;
  query: string;
  planets: Planet[];
}

// ---------- Components ----------

interface BaseComponent {
  id: string;
  name: string;
  cost: number;
  /** Dry mass in tonnes. */
  massT: number;
  blurb: string;
}

export interface PayloadComponent extends BaseComponent {
  module: 'payload';
  maxCrew: number;
  landerLegs: boolean;
  lab: boolean;
  sampleBay: boolean;
  /** Built-in life support, in mission days (GAME MODEL). */
  lifeSupportDays: number;
}
export interface ThrusterComponent extends BaseComponent {
  module: 'thruster';
  thrustKN: number;
  ispS: number;
  /** False for engines too weak to lift off from a planet on their own (Ion Hybrid). */
  canLiftOff: boolean;
}
export interface FuelComponent extends BaseComponent {
  module: 'fuel';
  fuelT: number;
}
export interface CommsComponent extends BaseComponent {
  module: 'comms';
  rangeTier: 1 | 2 | 3;
}
export interface PressureComponent extends BaseComponent {
  module: 'pressure';
  ratingAtm: number;
  crewRated: boolean;
}
export interface ProtectionComponent extends BaseComponent {
  module: 'protection';
  minK: number;
  maxK: number;
}

export type RocketComponent =
  | PayloadComponent
  | ThrusterComponent
  | FuelComponent
  | CommsComponent
  | PressureComponent
  | ProtectionComponent;

// ---------- Build ----------

export type SlotId =
  | 'payload'
  | 'comms'
  | 'pressure'
  | 'fuel-0'
  | 'fuel-1'
  | 'fuel-2'
  | 'thruster-0'
  | 'thruster-1'
  | 'protection';

export interface RocketBuild {
  payload: string | null;
  comms: string | null;
  pressure: string | null;
  fuel: [string | null, string | null, string | null];
  thrusters: [string | null, string | null];
  protection: string | null;
  crew: number;
}

// ---------- Mission ----------

export type MissionStage =
  | 'launch'
  | 'orbit'
  | 'transit'
  | 'approach'
  | 'landing'
  | 'surface'
  | 'ascent'
  | 'return'
  | 'reentry';

export const MISSION_STAGES: readonly MissionStage[] = [
  'launch',
  'orbit',
  'transit',
  'approach',
  'landing',
  'surface',
  'ascent',
  'return',
  'reentry',
];

export type CheckStatus = 'pass' | 'warn' | 'fail';

export type CheckId =
  | 'liftoff-twr'
  | 'fuel-launch'
  | 'comms'
  | 'fuel-transit'
  | 'protection'
  | 'pressure'
  | 'landing-gear'
  | 'fuel-landing'
  | 'life-support'
  | 'ascent-twr'
  | 'fuel-ascent'
  | 'fuel-return'
  | 'reentry'
  | 'total-dv';

export interface CheckResult {
  id: CheckId;
  stage: MissionStage;
  label: string;
  status: CheckStatus;
  actual: number | string;
  required: number | string;
  unit?: string;
  detail: string;
}

export interface DeltaVLeg {
  leg: 'earthLaunch' | 'transitOut' | 'landing' | 'ascent' | 'transitBack' | 'earthReturn';
  stage: MissionStage;
  deltaVKms: number;
  /** True when the leg needs a high-thrust (lift-off capable) engine. */
  highThrust: boolean;
}

export interface MissionRequirements {
  deltaVKms: number;
  legs: DeltaVLeg[];
  minLiftoffTWR: number;
  minAscentTWR: number;
  commsTier: 1 | 2 | 3;
  pressureAtm: number | null;
  tempRangeK: [number, number] | null;
  lifeSupportDays: number | null;
}

export interface MissionResult {
  success: boolean;
  /** Last stage the rocket reached (the failing stage on failure, 'reentry' on success). */
  stageReached: MissionStage;
  failedAt: MissionStage | null;
  stagesCleared: number;
  checks: CheckResult[];
  fuelTimeline: { stage: MissionStage; fuelFrac: number }[];
  pressureTimeline: { stage: MissionStage; atm: number; ok: boolean }[];
  fuelRemainingFrac: number;
}

export interface BuildStats {
  cost: number;
  dryMassT: number;
  fuelT: number;
  wetMassT: number;
  /** Ideal Δv with the best-Isp engine for the whole burn (shown live in the builder). */
  deltaVKms: number;
  liftoffTWR: number;
  liftoffThrustKN: number;
  bestIspS: number;
  commsTier: 0 | 1 | 2 | 3;
  pressureAtm: number;
  crewRated: boolean;
  protectionRange: [number, number] | null;
  lifeSupportDays: number;
}

// ---------- Scoring / runs ----------

export interface AttemptScore {
  mission: number;
  performance: number;
  budget: number;
  selection: number;
  resources: number;
  base: number;
  crew: number;
  crewMultiplier: number;
  crewAdjustment: number;
  total: number;
}

export interface DebriefItem {
  kind: 'cause' | 'good' | 'tip';
  text: string;
}

export interface Attempt {
  n: number;
  planetId: string;
  build: RocketBuild;
  cost: number;
  result: MissionResult;
  score: AttemptScore;
  debrief: DebriefItem[];
  at: string;
}

export interface Run {
  id: string;
  difficulty: Difficulty;
  playerName: string;
  attempts: Attempt[];
  startedAt: string;
  submittedEntryId: string | null;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  difficulty: Difficulty;
  average: number;
  best: number;
  planetsVisited: string[];
  date: string;
}
