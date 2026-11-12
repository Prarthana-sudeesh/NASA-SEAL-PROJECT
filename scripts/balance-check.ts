// Balance check: every planet × every part combination.
// Run with: npm run balance-check   (exits non-zero if a rule fails)
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIFFICULTIES, SLOT_ORDER, partsOf, type Difficulty } from '../src/game/config.ts';
import { bestDials, buildCost, simulate, type Build } from '../src/game/engine.ts';
import type { Planet, PlanetSnapshot } from '../src/data/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(
  readFileSync(resolve(here, '../src/data/planets.json'), 'utf8'),
) as PlanetSnapshot;
const byId = new Map(snapshot.planets.map((p) => [p.id, p]));

function allBuilds(): Build[] {
  let builds: Build[] = [
    { payload: null, antenna: null, body: null, hull: null, engine: null, crew: 0 },
  ];
  for (const kind of SLOT_ORDER) {
    builds = builds.flatMap((b) => partsOf(kind).map((p) => ({ ...b, [kind]: p.id })));
  }
  return builds;
}

const describe = (b: Build) =>
  SLOT_ORDER.map((k) => b[k]?.split('-').slice(1).join('-')).join(' + ');
let failures = 0;
const builds = allBuilds();

for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
  const cfg = DIFFICULTIES[d];
  console.log(`\n=== ${cfg.label} (budget ${cfg.budget}, ${builds.length} builds) ===`);
  const winsByBuild = new Map<Build, number>();
  for (const id of cfg.planets) {
    const planet = byId.get(id) as Planet | undefined;
    if (!planet) {
      failures++;
      console.log(`  ✗ planet ${id} missing from planets.json`);
      continue;
    }
    let cheapest: { cost: number; build: Build; score: number } | null = null;
    let wins = 0;
    let bestScore = 0;
    for (const b of builds) {
      const dials = bestDials(b, planet);
      if (!dials) continue;
      const cost = buildCost(b);
      if (cost > cfg.budget * 1.15) continue;
      wins++;
      winsByBuild.set(b, (winsByBuild.get(b) ?? 0) + 1);
      const score = simulate(b, dials, planet, d).total;
      bestScore = Math.max(bestScore, score);
      if (cost <= cfg.budget && (!cheapest || cost < cheapest.cost))
        cheapest = { cost, build: b, score };
    }
    console.log(
      `  ${planet.name.padEnd(20)} ${String(Math.round(planet.eqTempK.value)).padStart(4)} K  ${planet.surfaceGravityG.value.toFixed(2)} g  ` +
        `${String(planet.distanceLy.value).padStart(6)} ly  wins ${String(wins).padStart(3)}  cheapest ${cheapest?.cost ?? 'n/a'}  best score ${bestScore}`,
    );
    if (cheapest) console.log(`      ${describe(cheapest.build)}`);
    else {
      failures++;
      console.log(`  ✗ ${planet.name}: no winning build within budget`);
    }
  }
  if (d === 'hard') {
    const universal = [...winsByBuild.values()].filter((n) => n === cfg.planets.length).length;
    if (universal) {
      failures++;
      console.log(`  ✗ ${universal} build(s) win every Hard planet`);
    } else console.log('  ✓ No single rocket wins every Hard planet');
  }
}

console.log(failures ? `\n${failures} balance rule(s) failed.` : '\nAll balance rules pass.');
process.exit(failures ? 1 : 0);
