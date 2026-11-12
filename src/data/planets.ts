// Typed access to the bundled NASA Exoplanet Archive snapshot (works fully offline).
import raw from './planets.json';
import type { Difficulty, Planet, PlanetSnapshot } from './types.ts';

const ATMOS = ['thin', 'earthlike', 'thick', 'scorching', 'frozen'];

/** Returns a list of schema problems (empty when valid). */
export function validateSnapshot(data: unknown): string[] {
  const errors: string[] = [];
  const s = data as Partial<PlanetSnapshot>;
  if (!s || typeof s !== 'object') return ['Snapshot is not an object'];
  if (typeof s.retrievedAt !== 'string') errors.push('retrievedAt missing');
  if (!Array.isArray(s.planets)) return [...errors, 'planets missing'];
  const ids = new Set<string>();
  s.planets.forEach((p: Planet, i) => {
    const where = `planets[${i}] ${p?.name ?? ''}`;
    if (!p.id || ids.has(p.id)) errors.push(`${where}: missing or duplicate id`);
    ids.add(p.id);
    if (!['easy', 'medium', 'hard'].includes(p.difficulty)) errors.push(`${where}: bad difficulty`);
    if (!p.description || p.description.length < 40) errors.push(`${where}: description too short`);
    const nums: (keyof Planet)[] = [
      'distanceLy',
      'radiusEarth',
      'massEarth',
      'eqTempK',
      'surfaceGravityG',
      'escapeVelocityKms',
    ];
    for (const k of nums) {
      const v = p[k] as { value: unknown; source: unknown } | undefined;
      if (!v || typeof v.value !== 'number' || !(v.value > 0))
        errors.push(`${where}: ${k} invalid`);
      if (v && v.source !== 'nasa' && v.source !== 'model')
        errors.push(`${where}: ${k} source invalid`);
    }
    if (p.radiusEarth?.value > 2.5) errors.push(`${where}: radius above 2.5 R⊕`);
    if (!ATMOS.includes(p.atmosphere?.value)) errors.push(`${where}: atmosphere invalid`);
    if (p.atmosphere?.source !== 'model') errors.push(`${where}: atmosphere must be GAME MODEL`);
  });
  return errors;
}

const snapshot = raw as PlanetSnapshot;
export const SNAPSHOT_ERRORS = validateSnapshot(snapshot);
export const PLANETS: Planet[] = SNAPSHOT_ERRORS.length ? [] : snapshot.planets;
export const DATA_RETRIEVED_AT = snapshot.retrievedAt;
export const DATA_SOURCE = snapshot.source;

export function planetsFor(difficulty: Difficulty): Planet[] {
  return PLANETS.filter((p) => p.difficulty === difficulty);
}

export function getPlanet(id: string | null | undefined): Planet | undefined {
  return id ? PLANETS.find((p) => p.id === id) : undefined;
}
