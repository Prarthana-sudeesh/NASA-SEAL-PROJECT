// Mission requirements derived from a planet and difficulty (GAME MODEL).
import { DIFFICULTY } from '../config/difficulty.ts';
import {
  DV,
  GAME_DV_SCALE,
  LIFE_SUPPORT,
  MIN_ASCENT_TWR,
  MIN_LIFTOFF_TWR,
  PRESSURE_BY_ATMOSPHERE,
} from '../config/physics.ts';
import type { DeltaVLeg, Difficulty, MissionRequirements, Planet } from '../data/types.ts';
import { commsTierFor } from './physics.ts';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Transit Δv one way (km/s, scaled). */
export function transitDeltaV(distanceLy: number): number {
  return (
    (DV.transitBase + DV.transitPerLog10Ly * Math.log10(Math.max(distanceLy, 1))) * GAME_DV_SCALE
  );
}

export function deltaVLegs(planet: Planet): DeltaVLeg[] {
  const vEsc = planet.escapeVelocityKms.value;
  const ly = planet.distanceLy.value;
  const s = GAME_DV_SCALE;
  return [
    { leg: 'earthLaunch', stage: 'launch', deltaVKms: DV.earthLaunch * s, highThrust: true },
    { leg: 'transitOut', stage: 'transit', deltaVKms: transitDeltaV(ly), highThrust: false },
    {
      leg: 'landing',
      stage: 'landing',
      deltaVKms: DV.landingPerEscape * vEsc * s,
      highThrust: true,
    },
    { leg: 'ascent', stage: 'ascent', deltaVKms: DV.ascentPerEscape * vEsc * s, highThrust: true },
    { leg: 'transitBack', stage: 'return', deltaVKms: transitDeltaV(ly), highThrust: false },
    { leg: 'earthReturn', stage: 'reentry', deltaVKms: DV.earthReturn * s, highThrust: false },
  ];
}

export function lifeSupportDaysRequired(distanceLy: number): number {
  return Math.round(
    LIFE_SUPPORT.baseDays + LIFE_SUPPORT.daysPerLog10Ly * Math.log10(Math.max(distanceLy, 1)),
  );
}

export function missionRequirements(planet: Planet, difficulty: Difficulty): MissionRequirements {
  const cfg = DIFFICULTY[difficulty];
  const legs = deltaVLegs(planet);
  const total = legs.reduce((sum, l) => sum + l.deltaVKms, 0);
  return {
    deltaVKms: round2(total),
    legs,
    minLiftoffTWR: MIN_LIFTOFF_TWR,
    minAscentTWR: MIN_ASCENT_TWR,
    commsTier: commsTierFor(planet.distanceLy.value),
    pressureAtm: cfg.checksInPlay.includes('pressure')
      ? PRESSURE_BY_ATMOSPHERE[planet.atmosphere.value]
      : null,
    tempRangeK: cfg.checksInPlay.includes('protection')
      ? [planet.eqTempK.value, planet.eqTempK.value]
      : null,
    lifeSupportDays: cfg.checksInPlay.includes('life-support')
      ? lifeSupportDaysRequired(planet.distanceLy.value)
      : null,
  };
}
