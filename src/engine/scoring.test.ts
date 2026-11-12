import { SCORING } from '../config/scoring.ts';
import type { MissionResult } from '../data/types.ts';
import { build, GOOD_EASY, makePlanet } from '../test/fixtures.ts';
import { evaluateBuild, simulateMission } from './mission.ts';
import {
  applyCrew,
  averageScore,
  budgetPoints,
  marginScore,
  missionPoints,
  performancePoints,
  resourcePoints,
  scoreAttempt,
  selectionPoints,
} from './scoring.ts';

const near = makePlanet();
const result = (over: Partial<MissionResult>): MissionResult => ({
  success: false,
  stageReached: 'launch',
  failedAt: 'launch',
  stagesCleared: 0,
  checks: [],
  fuelTimeline: [],
  pressureTimeline: [],
  fuelRemainingFrac: 0,
  ...over,
});

describe('scoring', () => {
  it('mission points: 400 on success, 40 per stage otherwise', () => {
    expect(missionPoints(result({ success: true, stagesCleared: 9 }))).toBe(400);
    expect(missionPoints(result({ stagesCleared: 0 }))).toBe(0);
    expect(missionPoints(result({ stagesCleared: 5 }))).toBe(200);
  });

  it('performance rewards a healthy 5–25% Δv margin', () => {
    expect(marginScore(0.1, 0.05, 0.25, 1.5)).toBe(1);
    expect(marginScore(-0.2, 0.05, 0.25, 1.5)).toBeLessThan(0.6);
    expect(marginScore(1.5, 0.05, 0.25, 1.5)).toBe(0);
    const healthy = performancePoints(11, 10, 1.6);
    const under = performancePoints(8, 10, 1.6);
    const over = performancePoints(25, 10, 1.6);
    expect(healthy).toBe(SCORING.performance.max);
    expect(under).toBeLessThan(healthy);
    expect(over).toBeLessThan(healthy);
  });

  it('budget: full in 70–100%, zero at 15% overspend', () => {
    expect(budgetPoints(800, 1000, true)).toBe(150);
    expect(budgetPoints(1000, 1000, true)).toBe(150);
    expect(budgetPoints(1150, 1000, true)).toBe(0);
    expect(budgetPoints(1075, 1000, true)).toBe(75);
    expect(budgetPoints(200, 1000, true)).toBeGreaterThan(budgetPoints(200, 1000, false));
    expect(budgetPoints(200, 1000, false)).toBeLessThan(150);
  });

  it('component selection: suitable and cheapest scores best', () => {
    const ideal = selectionPoints(GOOD_EASY, near, 'easy');
    const overkill = selectionPoints({ ...GOOD_EASY, comms: 'deep-space-relay' }, near, 'easy');
    const missing = selectionPoints({ ...GOOD_EASY, comms: null }, near, 'easy');
    expect(ideal).toBe(150);
    expect(overkill).toBeLessThan(ideal);
    expect(missing).toBeLessThan(overkill);
  });

  it('resource management: ideal leftover fuel is 2–20%', () => {
    const b = GOOD_EASY;
    const ev = evaluateBuild(b, near, 'easy');
    const base = simulateMission(b, near, 'easy');
    expect(resourcePoints({ ...base, success: true, fuelRemainingFrac: 0.1 }, ev)).toBe(150);
    expect(resourcePoints({ ...base, success: true, fuelRemainingFrac: 0.6 }, ev)).toBeLessThan(
      150,
    );
  });

  it('astronaut multiplier on success and penalty on failure', () => {
    expect(applyCrew(800, 2, true).total).toBe(960);
    expect(applyCrew(800, 2, true).multiplier).toBeCloseTo(1.2);
    expect(applyCrew(300, 2, false).total).toBe(180);
    expect(applyCrew(100, 4, false).total).toBe(0); // floor at 0
  });

  it('scoreAttempt sums categories and applies crew', () => {
    const crewed = build({ ...GOOD_EASY, payload: 'crew-capsule', crew: 2 });
    const r = simulateMission(crewed, near, 'easy');
    const s = scoreAttempt(crewed, near, 'easy', r, evaluateBuild(crewed, near, 'easy'));
    expect(s.base).toBe(s.mission + s.performance + s.budget + s.selection + s.resources);
    expect(s.base).toBeLessThanOrEqual(1000);
    if (r.success) expect(s.total).toBe(Math.round(s.base * 1.2));
    else expect(s.total).toBe(Math.max(0, s.base - 120));
  });

  it('overspend reduces the budget score in a full attempt', () => {
    const cheap = GOOD_EASY;
    const pricey = build({
      ...GOOD_EASY,
      payload: 'habitat-module',
      comms: 'deep-space-relay',
      thrusters: ['nuclear-thermal', 'ion-hybrid'],
      fuel: ['tank-large', 'tank-large', null],
    });
    const sc = (b: typeof cheap) =>
      scoreAttempt(
        b,
        near,
        'easy',
        simulateMission(b, near, 'easy'),
        evaluateBuild(b, near, 'easy'),
      );
    expect(sc(pricey).budget).toBeLessThan(sc(cheap).budget);
  });

  it('averages 10 attempts', () => {
    expect(averageScore([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])).toBe(550);
    expect(averageScore([])).toBe(0);
    expect(averageScore([1, 2])).toBe(1.5);
  });
});
