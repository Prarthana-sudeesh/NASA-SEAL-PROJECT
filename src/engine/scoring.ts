// Per-attempt scoring (0–1,000 before the astronaut multiplier) and run aggregation.
import { COMMS, PAYLOADS, PRESSURE, PROTECTION } from '../config/components.ts';
import { DIFFICULTY } from '../config/difficulty.ts';
import { MIN_LIFTOFF_TWR, PRESSURE_BY_ATMOSPHERE } from '../config/physics.ts';
import { SCORING } from '../config/scoring.ts';
import type {
  AttemptScore,
  Difficulty,
  MissionResult,
  Planet,
  RocketBuild,
} from '../data/types.ts';
import { buildStats, installed } from './build.ts';
import type { Evaluation } from './mission.ts';
import { commsTierFor } from './physics.ts';
import { missionRequirements } from './requirements.ts';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function missionPoints(result: MissionResult): number {
  if (result.success) return SCORING.mission.max;
  return Math.min(SCORING.mission.max, result.stagesCleared * SCORING.mission.perStageCleared);
}

/** Score a margin (fraction above requirement) into 0..1 using an ideal band. */
export function marginScore(
  margin: number,
  idealMin: number,
  idealMax: number,
  overMax: number,
): number {
  if (margin < 0) return clamp(0.6 * (1 + margin / 0.3), 0, 0.6);
  if (margin < idealMin) return 0.8 + 0.2 * (margin / idealMin);
  if (margin <= idealMax) return 1;
  return clamp(1 - (margin - idealMax) / (overMax - idealMax), 0, 1);
}

export function performancePoints(dvAvail: number, dvReq: number, liftoffTWR: number): number {
  const p = SCORING.performance;
  const half = p.max / 2;
  const dvMargin = dvReq > 0 ? dvAvail / dvReq - 1 : 0;
  const twrMargin = liftoffTWR / MIN_LIFTOFF_TWR - 1;
  const dv = marginScore(dvMargin, p.idealMin, p.idealMax, p.overMax);
  // TWR has a wider healthy band: anything from 5% to 100% above minimum is fine.
  const twr = marginScore(twrMargin, p.idealMin, 1.0, 3.0);
  return Math.round(half * dv + half * twr);
}

export function budgetPoints(cost: number, budget: number, success: boolean): number {
  const b = SCORING.budget;
  const frac = cost / budget;
  if (frac > 1) return Math.round(b.max * clamp(1 - (frac - 1) / b.zeroAtOverspend, 0, 1));
  if (frac >= b.idealMinFrac) return b.max;
  const shortfall = (b.idealMinFrac - frac) / b.idealMinFrac;
  const penalty = success ? b.underspendSuccessPenalty : b.underspendFailPenalty;
  return Math.round(b.max - penalty * shortfall);
}

/** Rank-based suitability: 1 for the cheapest suitable option, less for overkill, low if unsuitable/missing. */
function suitability<T extends { id: string; cost: number }>(
  chosen: T | undefined,
  options: T[],
  suitable: (o: T) => boolean,
): number {
  if (!chosen) return 0;
  if (!suitable(chosen)) return 0.2;
  const ok = options.filter(suitable).sort((a, b) => a.cost - b.cost);
  const rank = ok.findIndex((o) => o.id === chosen.id);
  return [1, 0.7, 0.45][rank] ?? 0.45;
}

export interface SelectionBreakdown {
  part: 'payload' | 'comms' | 'pressure' | 'protection';
  score: number; // 0..1
}

export function selectionBreakdown(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
): SelectionBreakdown[] {
  const parts = installed(build);
  const inPlay = DIFFICULTY[difficulty].checksInPlay;
  const T = planet.eqTempK.value;
  const out: SelectionBreakdown[] = [
    {
      part: 'payload',
      score: suitability(parts.payload, PAYLOADS, (p) => p.maxCrew >= build.crew && p.landerLegs),
    },
    {
      part: 'comms',
      score: suitability(
        parts.comms,
        COMMS,
        (c) => c.rangeTier >= commsTierFor(planet.distanceLy.value),
      ),
    },
  ];
  if (inPlay.includes('pressure')) {
    const need = PRESSURE_BY_ATMOSPHERE[planet.atmosphere.value];
    out.push({
      part: 'pressure',
      score: suitability(parts.pressure, PRESSURE, (p) => p.ratingAtm >= need),
    });
  }
  if (inPlay.includes('protection')) {
    out.push({
      part: 'protection',
      score: suitability(parts.protection, PROTECTION, (p) => T >= p.minK && T <= p.maxK),
    });
  }
  return out;
}

export function selectionPoints(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
): number {
  const parts = selectionBreakdown(build, planet, difficulty);
  const avg = parts.reduce((s, p) => s + p.score, 0) / parts.length;
  return Math.round(SCORING.selection.max * avg);
}

export function resourcePoints(result: MissionResult, ev: Evaluation): number {
  const r = SCORING.resources;
  const fuelFailed =
    result.checks.some((c) => c.status === 'fail' && c.id.startsWith('fuel')) ||
    result.checks.some((c) => c.status === 'fail' && c.id === 'reentry');
  if (!result.success && fuelFailed) return Math.round(r.max * 0.2);
  const projected = ev.fuelCapacityT > 0 ? ev.projectedFuelLeftT / ev.fuelCapacityT : 0;
  const left = result.success ? result.fuelRemainingFrac : Math.max(0, projected);
  let s: number;
  if (left < 0) s = 0.2;
  else if (left < r.idealFuelMin) s = 0.8;
  else if (left <= r.idealFuelMax) s = 1;
  else s = clamp(1 - (left - r.idealFuelMax) / 0.6, 0.2, 1);
  // A failed mission can't fully prove its resource plan.
  if (!result.success) s *= 0.6;
  return Math.round(r.max * s);
}

export function applyCrew(base: number, crew: number, success: boolean) {
  const c = SCORING.crew;
  if (success) {
    const multiplier = 1 + c.successBonusPerAstronaut * crew;
    const total = Math.round(base * multiplier);
    return { multiplier, adjustment: total - base, total };
  }
  const total = Math.max(0, base - c.failurePenaltyPerAstronaut * crew);
  return { multiplier: 1, adjustment: total - base, total };
}

export function scoreAttempt(
  build: RocketBuild,
  planet: Planet,
  difficulty: Difficulty,
  result: MissionResult,
  ev: Evaluation,
): AttemptScore {
  const req = missionRequirements(planet, difficulty);
  const stats = buildStats(build, req);
  const mission = missionPoints(result);
  const performance = performancePoints(stats.deltaVKms, req.deltaVKms, stats.liftoffTWR);
  const budget = budgetPoints(stats.cost, DIFFICULTY[difficulty].budget, result.success);
  const selection = selectionPoints(build, planet, difficulty);
  const resources = resourcePoints(result, ev);
  const base = mission + performance + budget + selection + resources;
  const crew = applyCrew(base, build.crew, result.success);
  return {
    mission,
    performance,
    budget,
    selection,
    resources,
    base,
    crew: build.crew,
    crewMultiplier: crew.multiplier,
    crewAdjustment: crew.adjustment,
    total: crew.total,
  };
}

export function averageScore(totals: number[]): number {
  if (totals.length === 0) return 0;
  return Math.round((totals.reduce((s, t) => s + t, 0) / totals.length) * 10) / 10;
}
