import type { Planet, RocketBuild } from '../data/types.ts';
import { emptyBuild } from '../engine/build.ts';
import { classifyAtmosphere, escapeVelocity, surfaceGravity } from '../engine/physics.ts';

export function makePlanet(
  over: Partial<{ ly: number; R: number; M: number; T: number }> = {},
): Planet {
  const ly = over.ly ?? 4.2;
  const R = over.R ?? 1;
  const M = over.M ?? 1;
  const T = over.T ?? 260;
  const g = surfaceGravity(M, R);
  const nasa = <V>(value: V) => ({ value, source: 'nasa' as const });
  const model = <V>(value: V) => ({ value, source: 'model' as const });
  return {
    id: 'test-planet',
    name: 'Test Planet b',
    host: 'Test Star',
    difficulty: 'easy',
    description: 'A made-up planet used only in unit tests for the mission engine.',
    distanceLy: nasa(ly),
    radiusEarth: nasa(R),
    massEarth: nasa(M),
    eqTempK: nasa(T),
    orbitalPeriodDays: nasa(10),
    discoveryYear: nasa(2020),
    discoveryMethod: nasa('Transit'),
    starSpectralType: nasa('M5 V'),
    starTeffK: nasa(3000),
    surfaceGravityG: model(g),
    escapeVelocityKms: model(escapeVelocity(M, R)),
    atmosphere: model(classifyAtmosphere(R, g, T)),
  };
}

export function build(parts: Partial<RocketBuild>): RocketBuild {
  return { ...emptyBuild(), ...parts };
}

/** A solid Easy build for a nearby Earth-like world. */
export const GOOD_EASY = build({
  payload: 'probe-pod',
  comms: 'low-gain',
  fuel: ['tank-large', null, null],
  thrusters: ['nuclear-thermal', null],
});
