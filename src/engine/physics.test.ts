import { DV, GAME_DV_SCALE } from '../config/physics.ts';
import {
  classifyAtmosphere,
  commsTierFor,
  escapeVelocity,
  parsecsToLightYears,
  propellantFor,
  surfaceGravity,
  thrustToWeight,
  tsiolkovsky,
} from './physics.ts';
import {
  deltaVLegs,
  lifeSupportDaysRequired,
  missionRequirements,
  transitDeltaV,
} from './requirements.ts';
import { makePlanet } from '../test/fixtures.ts';

describe('physics', () => {
  it('applies the Tsiolkovsky rocket equation', () => {
    // Δv = Isp·g0·ln(m0/mf) = 300 × 9.81 × ln(e) = 2.943 km/s
    expect(tsiolkovsky(300, Math.E, 1)).toBeCloseTo(2.943, 3);
    expect(tsiolkovsky(320, 100, 50)).toBeCloseTo((320 * 9.81 * Math.log(2)) / 1000, 6);
    expect(tsiolkovsky(320, 50, 100)).toBe(0);
    expect(tsiolkovsky(0, 100, 50)).toBe(0);
  });

  it('propellantFor is the inverse of Tsiolkovsky', () => {
    const m0 = 200;
    const dv = 3.2;
    const prop = propellantFor(dv, 450, m0);
    expect(tsiolkovsky(450, m0, m0 - prop)).toBeCloseTo(dv, 6);
  });

  it('computes surface gravity and escape velocity in Earth units', () => {
    expect(surfaceGravity(1, 1)).toBe(1);
    expect(surfaceGravity(4, 2)).toBe(1);
    expect(surfaceGravity(8, 2)).toBe(2);
    expect(escapeVelocity(1, 1)).toBeCloseTo(11.19, 2);
    expect(escapeVelocity(4, 1)).toBeCloseTo(22.38, 2);
  });

  it('computes thrust-to-weight', () => {
    expect(thrustToWeight(981, 100)).toBeCloseTo(1, 5);
    expect(thrustToWeight(981, 100, 2)).toBeCloseTo(0.5, 5);
    expect(thrustToWeight(100, 0)).toBe(0);
  });

  it('converts parsecs and picks comms tiers', () => {
    expect(parsecsToLightYears(1)).toBeCloseTo(3.26156, 5);
    expect(commsTierFor(4.2)).toBe(1);
    expect(commsTierFor(15)).toBe(2);
    expect(commsTierFor(59.9)).toBe(2);
    expect(commsTierFor(60)).toBe(3);
  });

  it('classifies atmospheres', () => {
    expect(classifyAtmosphere(1, 1, 280)).toBe('earthlike');
    expect(classifyAtmosphere(1.2, 1.3, 2000)).toBe('scorching');
    expect(classifyAtmosphere(1, 1, 140)).toBe('frozen');
    expect(classifyAtmosphere(0.7, 0.6, 280)).toBe('thin');
    expect(classifyAtmosphere(2.2, 1.2, 280)).toBe('thick');
  });
});

describe('mission requirements', () => {
  it('sums the six round-trip legs', () => {
    const p = makePlanet({ ly: 10 });
    const legs = deltaVLegs(p);
    expect(legs.map((l) => l.leg)).toEqual([
      'earthLaunch',
      'transitOut',
      'landing',
      'ascent',
      'transitBack',
      'earthReturn',
    ]);
    const vEsc = escapeVelocity(1, 1);
    const expected =
      (DV.earthLaunch +
        2 * (DV.transitBase + DV.transitPerLog10Ly * 1) +
        (DV.landingPerEscape + DV.ascentPerEscape) * vEsc +
        DV.earthReturn) *
      GAME_DV_SCALE;
    expect(missionRequirements(p, 'easy').deltaVKms).toBeCloseTo(expected, 2);
  });

  it('grows with distance and gravity', () => {
    expect(transitDeltaV(100)).toBeGreaterThan(transitDeltaV(10));
    const near = missionRequirements(makePlanet({ ly: 5 }), 'easy').deltaVKms;
    const far = missionRequirements(makePlanet({ ly: 500 }), 'easy').deltaVKms;
    const heavy = missionRequirements(makePlanet({ ly: 5, M: 4, R: 1.5 }), 'easy').deltaVKms;
    expect(far).toBeGreaterThan(near);
    expect(heavy).toBeGreaterThan(near);
  });

  it('only includes pressure/protection/life support where in play', () => {
    const p = makePlanet();
    expect(missionRequirements(p, 'easy').pressureAtm).toBeNull();
    expect(missionRequirements(p, 'medium').pressureAtm).toBe(1);
    expect(missionRequirements(p, 'medium').tempRangeK).toBeNull();
    expect(missionRequirements(p, 'hard').tempRangeK).toEqual([260, 260]);
    expect(missionRequirements(p, 'hard').lifeSupportDays).toBe(lifeSupportDaysRequired(4.2));
  });
});
