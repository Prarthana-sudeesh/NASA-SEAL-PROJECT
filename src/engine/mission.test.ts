import { simulateMission } from './mission.ts';
import { runAttempt } from './attempt.ts';
import { build, GOOD_EASY, makePlanet } from '../test/fixtures.ts';
import type { MissionStage } from '../data/types.ts';

const near = makePlanet();

describe('mission engine', () => {
  it('succeeds with a well-designed build', () => {
    const r = simulateMission(GOOD_EASY, near, 'easy');
    expect(r.success).toBe(true);
    expect(r.stageReached).toBe('reentry');
    expect(r.stagesCleared).toBe(9);
    expect(r.fuelRemainingFrac).toBeGreaterThan(0);
    expect(r.checks.every((c) => c.status !== 'fail')).toBe(true);
  });

  const failCases: [
    string,
    Parameters<typeof build>[0],
    ReturnType<typeof makePlanet>,
    'easy' | 'medium' | 'hard',
    MissionStage,
    string,
  ][] = [
    [
      'launch: ion engine cannot lift off',
      { ...GOOD_EASY, thrusters: ['ion-hybrid', null] },
      near,
      'easy',
      'launch',
      'liftoff-twr',
    ],
    [
      'launch: too heavy for thrust',
      {
        ...GOOD_EASY,
        fuel: ['tank-large', 'tank-large', 'tank-large'],
        thrusters: ['chem-mk1', null],
      },
      near,
      'easy',
      'launch',
      'liftoff-twr',
    ],
    [
      'transit: comms out of range',
      { ...GOOD_EASY },
      makePlanet({ ly: 40 }),
      'easy',
      'transit',
      'comms',
    ],
    [
      'transit: out of fuel',
      {
        ...GOOD_EASY,
        payload: 'crew-capsule',
        fuel: ['tank-small', null, null],
        thrusters: ['chem-mk1', null],
      },
      near,
      'easy',
      'transit',
      'fuel-transit',
    ],
    [
      'approach: burn-up without heat protection',
      {
        ...GOOD_EASY,
        comms: 'deep-space-relay',
        pressure: 'pressure-reinforced',
        protection: 'thermal-blanket',
      },
      makePlanet({ T: 1200 }),
      'hard',
      'approach',
      'protection',
    ],
    [
      'surface: pressure rating too low',
      { ...GOOD_EASY, comms: 'low-gain', pressure: 'pressure-standard' },
      makePlanet({ R: 2, M: 6 }),
      'medium',
      'surface',
      'pressure',
    ],
    [
      'ascent: stranded in heavy gravity',
      { ...GOOD_EASY, pressure: 'pressure-extreme' },
      makePlanet({ R: 1.6, M: 6.2 }),
      'medium',
      'ascent',
      'ascent-twr',
    ],
    [
      'return: crew life support runs out',
      {
        ...GOOD_EASY,
        payload: 'crew-capsule',
        crew: 2,
        comms: 'deep-space-relay',
        pressure: 'pressure-standard',
        protection: 'thermal-blanket',
        fuel: ['tank-large', 'tank-large', null],
        thrusters: ['chem-mk2', 'ion-hybrid'],
      },
      makePlanet({ ly: 9000, M: 0.5, R: 0.8 }),
      'hard',
      'return',
      'life-support',
    ],
  ];

  it.each(failCases)('fails at %s', (_name, parts, planet, diff, stage, checkId) => {
    const r = simulateMission(build(parts), planet, diff);
    expect(r.success).toBe(false);
    expect(r.failedAt).toBe(stage);
    expect(r.stageReached).toBe(stage);
    const failed = r.checks.find((c) => c.status === 'fail' && c.id !== 'total-dv');
    expect(failed?.id).toBe(checkId);
    // Engine stops at the first failed stage: no checks from later stages.
    const stages = r.checks.map((c) => c.stage);
    expect(stages.at(-1)).toBe(stage);
  });

  // Fuel-limited stages are found by search, so the test survives physics tuning.
  it.each(['landing', 'return', 'reentry'] as MissionStage[])(
    'a fuel-short build can fail at %s',
    (stage) => {
      const tanks = ['tank-small', 'tank-medium', 'tank-large', null];
      const engines = ['chem-mk1', 'chem-mk2', 'nuclear-thermal'];
      let found = false;
      for (let ly = 2; ly < 15 && !found; ly += 0.5) {
        for (const M of [0.5, 1, 2, 4]) {
          for (const a of tanks)
            for (const b of tanks)
              for (const e of engines) {
                const candidate = build({
                  ...GOOD_EASY,
                  fuel: [a ?? 'tank-small', b, null],
                  thrusters: [e, null],
                });
                const r = simulateMission(candidate, makePlanet({ ly, M }), 'easy');
                if (r.failedAt === stage) found = true;
              }
        }
      }
      expect(found).toBe(true);
    },
  );

  it('exposes a fuel timeline that never increases', () => {
    const r = simulateMission(GOOD_EASY, near, 'easy');
    const fr = r.fuelTimeline.map((f) => f.fuelFrac);
    for (let i = 1; i < fr.length; i++) expect(fr[i]).toBeLessThanOrEqual(fr[i - 1]);
  });

  it('runAttempt produces score and a 2–5 item debrief with a tip', () => {
    const a = runAttempt(GOOD_EASY, near, 'easy', 1, new Date('2026-01-01'));
    expect(a.score.total).toBeGreaterThan(0);
    expect(a.debrief.length).toBeGreaterThanOrEqual(2);
    expect(a.debrief.length).toBeLessThanOrEqual(5);
    expect(a.debrief.at(-1)?.kind).toBe('tip');
  });

  it('debrief names the specific failing decision', () => {
    const bad = build({
      ...GOOD_EASY,
      fuel: ['tank-small', null, null],
      thrusters: ['chem-mk1', null],
    });
    const a = runAttempt(bad, near, 'easy', 1);
    expect(a.debrief[0].kind).toBe('cause');
    expect(a.debrief[0].text).toMatch(/ran out of fuel/);
    expect(a.debrief[0].text).toMatch(/km\/s/);
  });
});
