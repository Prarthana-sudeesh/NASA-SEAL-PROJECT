// Fetches exoplanet data from the NASA Exoplanet Archive TAP service, curates difficulty pools,
// and writes src/data/planets.json. Run with: npm run fetch-planets
//
// The game runs fully offline from the committed snapshot; this script only refreshes it.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyAtmosphere,
  escapeVelocity,
  parsecsToLightYears,
  surfaceGravity,
} from '../src/engine/physics.ts';
import type { Difficulty, Planet, PlanetSnapshot } from '../src/data/types.ts';
import { DESCRIPTIONS, PREFERRED } from './planet-descriptions.ts';

const TAP_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
const TABLE = 'pscomppars';
const COLUMNS =
  'pl_name,hostname,sy_dist,pl_rade,pl_bmasse,pl_eqt,pl_orbper,disc_year,discoverymethod,st_spectype,st_teff';
const MAX_RADIUS = 2.5;
const POOL_SIZE: Record<Difficulty, number> = { easy: 10, medium: 10, hard: 12 };

/** Pool rules. Medium gravity is loosened from 1.8 g to 1.9 g so LHS 1140 b qualifies (see DECISIONS.md). */
const RULES: Record<Difficulty, (p: Derived) => boolean> = {
  easy: (p) => p.ly < 20 && p.g >= 0.6 && p.g <= 1.3 && p.T >= 200 && p.T <= 350,
  medium: (p) => p.ly >= 20 && p.ly <= 100 && p.g >= 0.5 && p.g <= 1.9 && p.T >= 150 && p.T <= 500,
  hard: (p) => p.g >= 0.4 && p.g <= 2.5 && (p.T > 600 || p.T < 150 || p.ly > 100),
};

interface Row {
  pl_name: string;
  hostname: string;
  sy_dist: number;
  pl_rade: number;
  pl_bmasse: number;
  pl_eqt: number;
  pl_orbper: number | null;
  disc_year: number;
  discoverymethod: string;
  st_spectype: string | null;
  st_teff: number | null;
}
interface Derived {
  row: Row;
  ly: number;
  g: number;
  T: number;
}

const r = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function fetchRows(query: string): Promise<Row[]> {
  const url = `${TAP_URL}?query=${encodeURIComponent(query)}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Archive request failed: HTTP ${res.status}`);
  return (await res.json()) as Row[];
}

function toPlanet(d: Derived, difficulty: Difficulty): Planet {
  const { row } = d;
  const nasa = <T>(value: T) => ({ value, source: 'nasa' as const });
  const model = <T>(value: T) => ({ value, source: 'model' as const });
  const description = DESCRIPTIONS[row.pl_name];
  if (!description)
    throw new Error(`Missing description for ${row.pl_name} in planet-descriptions.ts`);
  return {
    id: slug(row.pl_name),
    name: row.pl_name,
    host: row.hostname,
    difficulty,
    description,
    distanceLy: nasa(r(d.ly, 1)),
    radiusEarth: nasa(r(row.pl_rade, 3)),
    massEarth: nasa(r(row.pl_bmasse, 3)),
    eqTempK: nasa(Math.round(row.pl_eqt)),
    orbitalPeriodDays: nasa(row.pl_orbper === null ? null : r(row.pl_orbper, 3)),
    discoveryYear: nasa(row.disc_year),
    discoveryMethod: nasa(row.discoverymethod),
    starSpectralType: nasa(row.st_spectype),
    starTeffK: nasa(row.st_teff === null ? null : Math.round(row.st_teff)),
    surfaceGravityG: model(r(d.g, 2)),
    escapeVelocityKms: model(r(escapeVelocity(row.pl_bmasse, row.pl_rade), 2)),
    atmosphere: model(classifyAtmosphere(row.pl_rade, d.g, row.pl_eqt)),
  };
}

async function main() {
  const query =
    `select ${COLUMNS} from ${TABLE} where sy_dist is not null and pl_rade is not null ` +
    `and pl_bmasse is not null and pl_eqt is not null and pl_rade <= ${MAX_RADIUS}`;
  console.log('Querying NASA Exoplanet Archive…');
  const rows = await fetchRows(query);
  console.log(
    `  ${rows.length} planets with distance, radius, mass and temperature (R ≤ ${MAX_RADIUS} R⊕)`,
  );

  const derived: Derived[] = rows.map((row) => ({
    row,
    ly: parsecsToLightYears(row.sy_dist),
    g: surfaceGravity(row.pl_bmasse, row.pl_rade),
    T: row.pl_eqt,
  }));
  const byName = new Map(derived.map((d) => [d.row.pl_name, d]));
  const used = new Set<string>();
  const planets: Planet[] = [];

  for (const diff of ['easy', 'medium', 'hard'] as Difficulty[]) {
    const pool: Derived[] = [];
    for (const name of PREFERRED[diff]) {
      const d = byName.get(name);
      if (!d) {
        console.warn(`  ! ${name} not returned by archive; skipping`);
        continue;
      }
      if (!RULES[diff](d)) {
        console.warn(`  ! ${name} no longer passes ${diff} rules; skipping`);
        continue;
      }
      pool.push(d);
      used.add(name);
    }
    // Fill from rule-passing candidates (closest first) if preferred planets dropped out.
    const fill = derived
      .filter((d) => RULES[diff](d) && !used.has(d.row.pl_name) && DESCRIPTIONS[d.row.pl_name])
      .sort((a, b) => a.ly - b.ly);
    while (pool.length < POOL_SIZE[diff] && fill.length) {
      const d = fill.shift()!;
      pool.push(d);
      used.add(d.row.pl_name);
    }
    if (pool.length < 8) {
      throw new Error(
        `${diff} pool has only ${pool.length} planets; loosen RULES and log it in DECISIONS.md`,
      );
    }
    console.log(`  ${diff}: ${pool.map((p) => p.row.pl_name).join(', ')}`);
    planets.push(...pool.map((d) => toPlanet(d, diff)));
  }

  const snapshot: PlanetSnapshot = {
    source: 'NASA Exoplanet Archive',
    sourceUrl: 'https://exoplanetarchive.ipac.caltech.edu/',
    table: TABLE,
    retrievedAt: new Date().toISOString().slice(0, 10),
    query,
    planets,
  };
  const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/planets.json');
  writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Wrote ${planets.length} planets to ${out}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
