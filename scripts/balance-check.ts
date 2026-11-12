// Exhaustive balance check: every planet × every component combination.
// Run with: npm run balance-check   (exits non-zero if a rule fails)
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMMS,
  FUEL_TANKS,
  PAYLOADS,
  PRESSURE,
  PROTECTION,
  THRUSTERS,
} from '../src/config/components.ts';
import { DIFFICULTY } from '../src/config/difficulty.ts';
import { buildCost, emptyBuild } from '../src/engine/build.ts';
import { evaluateBuild, simulateMission } from '../src/engine/mission.ts';
import { missionRequirements } from '../src/engine/requirements.ts';
import { scoreAttempt } from '../src/engine/scoring.ts';
import type { Difficulty, Planet, PlanetSnapshot, RocketBuild } from '../src/data/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(
  readFileSync(resolve(here, '../src/data/planets.json'), 'utf8'),
) as PlanetSnapshot;

function multisets<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) return out.push([...acc]);
    for (let i = start; i < items.length; i++) rec(i, [...acc, items[i]]);
  };
  rec(0, []);
  return out;
}

function allBuilds(difficulty: Difficulty, crewOptions: boolean): RocketBuild[] {
  const cfg = DIFFICULTY[difficulty];
  const ids = <T extends { id: string }>(xs: T[]) => xs.map((x) => x.id);
  const thrusterSets = [1, 2].flatMap((k) => multisets(ids(THRUSTERS), k));
  const fuelSets = [1, 2, 3].flatMap((k) => multisets(ids(FUEL_TANKS), k));
  const pressures = cfg.modules.includes('pressure') ? ids(PRESSURE) : [null];
  const protections = cfg.modules.includes('protection') ? ids(PROTECTION) : [null];
  const builds: RocketBuild[] = [];
  for (const payload of PAYLOADS) {
    const crews = crewOptions ? [...new Set([0, Math.min(payload.maxCrew, cfg.maxCrew)])] : [0];
    for (const crew of crews)
      for (const thrusters of thrusterSets)
        for (const fuel of fuelSets)
          for (const comms of ids(COMMS))
            for (const pressure of pressures)
              for (const protection of protections) {
                const b = emptyBuild();
                b.payload = payload.id;
                b.comms = comms;
                b.pressure = pressure;
                b.protection = protection;
                b.crew = crew;
                b.fuel = [fuel[0] ?? null, fuel[1] ?? null, fuel[2] ?? null];
                b.thrusters = [thrusters[0] ?? null, thrusters[1] ?? null];
                builds.push(b);
              }
  }
  return builds;
}

const describe = (b: RocketBuild) =>
  [
    b.payload,
    b.comms,
    b.pressure,
    ...b.fuel,
    ...b.thrusters,
    b.protection,
    b.crew ? `crew ${b.crew}` : null,
  ]
    .filter(Boolean)
    .join(' + ');

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  const cfg = DIFFICULTY[difficulty];
  const planets = snapshot.planets.filter((p) => p.difficulty === difficulty);
  const builds = allBuilds(difficulty, true);
  console.log(
    `\n=== ${cfg.label} (budget ${cfg.budget}, ${planets.length} planets, ${builds.length} builds) ===`,
  );
  const successByBuild = new Map<RocketBuild, number>();

  for (const planet of planets as Planet[]) {
    const req = missionRequirements(planet, difficulty);
    let cheapest: { cost: number; build: RocketBuild } | null = null;
    let successes = 0;
    const scores: number[] = [];
    for (const b of builds) {
      const cost = buildCost(b);
      if (cost > cfg.budget * 1.15) continue;
      const result = simulateMission(b, planet, difficulty);
      if (result.success) {
        successes++;
        successByBuild.set(b, (successByBuild.get(b) ?? 0) + 1);
        if (cost <= cfg.budget && (!cheapest || cost < cheapest.cost))
          cheapest = { cost, build: b };
      }
      if (b.crew === 0 || result.success) {
        const ev = evaluateBuild(b, planet, difficulty);
        scores.push(scoreAttempt(b, planet, difficulty, result, ev).total);
      }
    }
    scores.sort((a, b) => a - b);
    const pct = (q: number) => scores[Math.floor(q * (scores.length - 1))] ?? 0;
    console.log(
      `  ${planet.name.padEnd(20)} Δv ${req.deltaVKms.toFixed(2).padStart(5)} km/s  ` +
        `wins ${String(successes).padStart(5)}  cheapest ${cheapest ? String(cheapest.cost).padStart(4) : ' n/a'}  ` +
        `score p10/p50/max ${pct(0.1)}/${pct(0.5)}/${scores.at(-1) ?? 0}`,
    );
    if (cheapest) console.log(`      cheapest: ${describe(cheapest.build)}`);
    if (!cheapest) fail(`${planet.name}: no successful build within budget`);
  }

  if (difficulty === 'hard') {
    const universal = [...successByBuild.entries()].filter(([, n]) => n === planets.length);
    if (universal.length > 0) {
      fail(
        `${universal.length} build(s) succeed on every Hard planet, e.g. ${describe(universal[0][0])}`,
      );
    } else {
      const best = Math.max(0, ...successByBuild.values());
      console.log(
        `  ✓ No one-size-fits-all rocket on Hard (best single build wins ${best}/${planets.length})`,
      );
    }
  }
}

console.log(failures ? `\n${failures} balance rule(s) failed.` : '\nAll balance rules pass.');
process.exit(failures ? 1 : 0);
