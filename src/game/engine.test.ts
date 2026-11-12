import { getPlanet } from '../data/planets.ts';
import type { Planet } from '../data/types.ts';
import { ASTRONAUT, SCIENTIST } from './ui/Pixel.tsx';
import { DIFFICULTIES, SCORING, TUNING } from './config.ts';
import {
  bestDials,
  budgetPoints,
  buildCost,
  checks,
  crewAdjust,
  dialZones,
  dryMass,
  fuelNeeded,
  launchBlocks,
  parts,
  quizFor,
  requiredSeal,
  simulate,
  twrEarth,
  type Build,
} from './engine.ts';

const proxima = getPlanet('proxima-cen-b') as Planet;
const lava = getPlanet('55-cnc-e') as Planet;
const GOOD: Build = {
  payload: 'payload-capsule',
  antenna: 'antenna-low',
  body: 'body-medium',
  hull: 'hull-aluminium',
  engine: 'engine-small',
  crew: 1,
};

describe('planet pools', () => {
  it('every configured planet exists in the NASA snapshot', () => {
    for (const d of Object.values(DIFFICULTIES))
      for (const id of d.planets) expect(getPlanet(id), id).toBeDefined();
  });
});

describe('rocket physics (game model)', () => {
  it('needs every part before it is complete', () => {
    expect(parts({ ...GOOD, engine: null })).toBeNull();
    expect(launchBlocks({ ...GOOD, engine: null }, 'easy')[0]).toMatch(/missing: engine/);
    expect(launchBlocks(GOOD, 'easy')).toEqual([]);
  });

  it('blocks crew without a capsule and big overspend', () => {
    expect(launchBlocks({ ...GOOD, payload: 'payload-probe' }, 'easy').join()).toMatch(
      /crew capsule/,
    );
    const pricey: Build = {
      ...GOOD,
      hull: 'hull-carbon',
      engine: 'engine-nuclear',
      body: 'body-long',
      antenna: 'antenna-deep',
    };
    expect(buildCost(pricey)).toBeGreaterThan(DIFFICULTIES.easy.budget * 1.15);
    expect(launchBlocks(pricey, 'easy').join()).toMatch(/over/);
  });

  it('heavier hulls and longer tanks add mass; thrust dial changes fuel use', () => {
    const p = parts(GOOD)!;
    const steel = parts({ ...GOOD, hull: 'hull-steel' })!;
    expect(dryMass(steel, 1)).toBeGreaterThan(dryMass(p, 1));
    expect(dryMass(p, 3) - dryMass(p, 0)).toBeCloseTo(0.9);
    const low = fuelNeeded(p, 1, { fuel: 50, thrust: 20, pressure: 1 }, proxima);
    const high = fuelNeeded(p, 1, { fuel: 50, thrust: 90, pressure: 1 }, proxima);
    expect(high).toBeGreaterThan(low);
    const nuclear = parts({ ...GOOD, engine: 'engine-nuclear' })!;
    expect(fuelNeeded(nuclear, 1, { fuel: 50, thrust: 50, pressure: 1 }, proxima)).toBeLessThan(
      fuelNeeded(p, 1, { fuel: 50, thrust: 50, pressure: 1 }, proxima),
    );
  });

  it('thrust-to-weight = thrust ÷ (mass × g0)', () => {
    const p = parts(GOOD)!;
    const d = { fuel: 50, thrust: 100, pressure: 1 };
    expect(twrEarth(p, 1, d)).toBeCloseTo(1500 / ((dryMass(p, 1) + 40) * TUNING.g0), 5);
  });

  it('pressure seal must hold the outside pressure and at least 1 atm', () => {
    expect(requiredSeal(proxima)).toBe(1);
    expect(requiredSeal(lava)).toBe(3);
  });
});

describe('mission checks', () => {
  it('a well-tuned build succeeds', () => {
    const d = bestDials(GOOD, proxima)!;
    const r = simulate(GOOD, d, proxima, 'easy');
    expect(r.success).toBe(true);
    expect(r.stagesCleared).toBe(6);
    expect(r.total).toBe(Math.round(r.base * (1 + SCORING.crewBonus)));
  });

  const cases: [
    string,
    Partial<Build>,
    Partial<{ fuel: number; thrust: number; pressure: number }>,
    Planet,
    string,
    string,
  ][] = [
    ['too heavy to lift off', {}, { thrust: 10 }, proxima, 'launch', 'twr-earth'],
    ['out of fuel', {}, { fuel: 10 }, proxima, 'journey', 'fuel'],
    ['antenna too weak', {}, {}, getPlanet('trappist-1-e')!, 'journey', 'comms'],
    ['seal too low', {}, { pressure: 0 }, proxima, 'landing', 'pressure-low'],
    ['seal too high for hull', {}, { pressure: 5 }, proxima, 'landing', 'pressure-high'],
  ];
  it.each(cases)('fails when %s', (_n, b, d, planet, stage, id) => {
    const r = simulate(
      { ...GOOD, ...b },
      { fuel: 72, thrust: 66, pressure: 1, ...d },
      planet,
      'easy',
    );
    expect(r.success).toBe(false);
    expect(r.failedAt).toBe(stage);
    expect(r.checks.find((c) => !c.ok)?.id).toBe(id);
    expect(r.explanation[0].length).toBeGreaterThan(20);
  });

  it('fails when the hull melts on a lava world', () => {
    const carbon: Build = {
      ...GOOD,
      antenna: 'antenna-high',
      hull: 'hull-carbon',
      engine: 'engine-nuclear',
      crew: 0,
    };
    const d = bestDials(carbon, lava)!;
    expect(simulate(carbon, d, lava, 'hard').success).toBe(true);
    const r = simulate({ ...carbon, hull: 'hull-aluminium' }, d, lava, 'hard');
    expect(r.failedAt).toBe('approach');
    expect(r.checks.find((c) => !c.ok)?.id).toBe('heat');
    expect(r.explanation[0]).toMatch(/burned up/);
  });

  it('can be stranded by heavy gravity', () => {
    const heavy = getPlanet('lhs-1140-b')!;
    const b: Build = { ...GOOD, hull: 'hull-steel', antenna: 'antenna-high', body: 'body-long' };
    const r = simulate(b, { fuel: 100, thrust: 100, pressure: 8 }, heavy, 'hard');
    expect(
      r.checks.some((c) => c.id === 'twr-planet' && !c.ok) ||
        r.checks.some((c) => c.id === 'twr-earth' && !c.ok),
    ).toBe(true);
  });

  it('dial zones bracket the best settings', () => {
    const z = dialZones(GOOD, { fuel: 50, thrust: 50, pressure: 1 }, proxima)!;
    const d = bestDials(GOOD, proxima)!;
    expect(d.fuel).toBeGreaterThanOrEqual(z.fuel![0]);
    expect(d.thrust).toBeGreaterThanOrEqual(z.thrust![0]);
    expect(z.pressure).toEqual([1, 3]);
    expect(checks(GOOD, d, proxima).every((c) => c.ok)).toBe(true);
  });
});

describe('scoring', () => {
  it('budget is scored on its own', () => {
    expect(budgetPoints(800, 1000)).toBe(SCORING.budget);
    expect(budgetPoints(1075, 1000)).toBe(75);
    expect(budgetPoints(1150, 1000)).toBe(0);
  });
  it('astronauts multiply success and cost points on failure', () => {
    expect(crewAdjust(800, 2, true).total).toBe(960);
    expect(crewAdjust(300, 2, false).total).toBe(180);
    expect(crewAdjust(50, 3, false).total).toBe(0);
  });
  it('a failed launch scores less than a success', () => {
    const d = bestDials(GOOD, proxima)!;
    expect(simulate(GOOD, { ...d, fuel: 5 }, proxima, 'easy').total).toBeLessThan(
      simulate(GOOD, d, proxima, 'easy').total,
    );
  });
});

describe('pixel sprites', () => {
  it('rows are rectangular', () => {
    for (const s of [ASTRONAUT, SCIENTIST]) expect(new Set(s.map((r) => r.length)).size).toBe(1);
  });
});

describe('science quiz', () => {
  it('asks about heat on a lava world and the answer is the lightest hull that survives', () => {
    const q = quizFor(lava, 1);
    expect(q.id).toBe('heat');
    expect(q.options[q.answer]).toMatch(/Carbon-ceramic/);
  });
  it('every question has a valid answer for every planet and mission', () => {
    for (const d of Object.values(DIFFICULTIES))
      for (const id of d.planets)
        for (let n = 1; n <= 5; n++) {
          const q = quizFor(getPlanet(id)!, n);
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
          expect(new Set(q.options).size).toBe(q.options.length);
        }
  });
  it('a correct answer adds the quiz bonus', () => {
    const d = bestDials(GOOD, proxima)!;
    const right = simulate(GOOD, d, proxima, 'easy', true);
    const wrong = simulate(GOOD, d, proxima, 'easy', false);
    expect(right.base - wrong.base).toBe(SCORING.quiz);
  });
});
