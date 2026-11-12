// Runs one full attempt: simulate → score → debrief.
import type { Attempt, Difficulty, Planet, RocketBuild } from '../data/types.ts';
import { buildCost } from './build.ts';
import { generateDebrief } from './debrief.ts';
import { evaluateBuild, simulateMission } from './mission.ts';
import { scoreAttempt } from './scoring.ts';

export function runAttempt(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
  n: number,
  now: Date = new Date(),
): Attempt {
  const ev = evaluateBuild(build, planet, difficulty);
  const result = simulateMission(build, planet, difficulty);
  const score = scoreAttempt(build, planet, difficulty, result, ev);
  const debrief = generateDebrief(build, planet, difficulty, result, score, ev);
  return {
    n,
    planetId: planet.id,
    build,
    cost: buildCost(build),
    result,
    score,
    debrief,
    at: now.toISOString(),
  };
}
