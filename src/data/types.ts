// Shared data models. Framework-free: imported by the game engine, scripts and UI.

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTY_IDS: readonly Difficulty[] = ['easy', 'medium', 'hard'];

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

export interface LeaderboardEntry {
  id: string;
  name: string;
  difficulty: Difficulty;
  average: number;
  best: number;
  planetsVisited: string[];
  date: string;
}
