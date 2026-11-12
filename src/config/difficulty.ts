import type { CheckId, Difficulty, ModuleType } from '../data/types.ts';

export type HintMode = 'all' | 'failing' | 'none';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  budget: number;
  modules: ModuleType[];
  /** Modules that must be fitted before launch is allowed. */
  requiredModules: ModuleType[];
  maxCrew: number;
  hints: HintMode;
  checksInPlay: CheckId[];
  planetSummary: string;
  newMechanics: string[];
}

const CORE_CHECKS: CheckId[] = [
  'liftoff-twr',
  'fuel-launch',
  'comms',
  'fuel-transit',
  'landing-gear',
  'fuel-landing',
  'ascent-twr',
  'fuel-ascent',
  'fuel-return',
  'reentry',
  'total-dv',
];

export const ATTEMPTS_PER_RUN = 10;

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    budget: 1000,
    modules: ['payload', 'comms', 'fuel', 'thruster'],
    requiredModules: ['payload', 'comms', 'fuel', 'thruster'],
    maxCrew: 2,
    hints: 'all',
    checksInPlay: CORE_CHECKS,
    planetSummary: 'Nearby, mild worlds under 20 light-years.',
    newMechanics: [
      'Payload, thrusters, fuel tanks and communication',
      'Checks: Δv, thrust-to-weight, comms range',
      'Live hints on every requirement',
      'Crew optional (0–2)',
    ],
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    budget: 850,
    modules: ['payload', 'comms', 'pressure', 'fuel', 'thruster'],
    requiredModules: ['payload', 'comms', 'fuel', 'thruster'],
    maxCrew: 4,
    hints: 'failing',
    checksInPlay: [...CORE_CHECKS, 'pressure'],
    planetSummary: 'A mix of worlds 20–100 light-years away, including TRAPPIST-1.',
    newMechanics: [
      'New module: Pressure Systems (swap tanks to match the atmosphere)',
      'New check: pressure rating',
      'Hints only on failing requirements',
      'Crew optional (0–4)',
    ],
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    budget: 1150,
    modules: ['payload', 'comms', 'pressure', 'fuel', 'thruster', 'protection'],
    requiredModules: ['payload', 'comms', 'pressure', 'fuel', 'thruster', 'protection'],
    maxCrew: 6,
    hints: 'none',
    checksInPlay: [...CORE_CHECKS, 'pressure', 'protection', 'life-support'],
    planetSummary: 'Extreme worlds: lava planets, frozen planets and distant systems.',
    newMechanics: [
      'New module: Protection Systems (all six modules required)',
      'New checks: heat/environment protection, crew life-support duration',
      'No live hints. Read the debrief.',
      'Crew optional (0–6)',
    ],
  },
};
