// Pure physics helpers (GAME MODEL). No React, no side effects.
import {
  ATMOSPHERE_RULES,
  COMMS_TIER_LIMITS_LY,
  EARTH_ESCAPE_KMS,
  G0,
  PC_TO_LY,
} from '../config/physics.ts';
import type { AtmosphereClass } from '../data/types.ts';

/** Tsiolkovsky rocket equation. Returns Δv in km/s. */
export function tsiolkovsky(ispS: number, wetMass: number, dryMass: number): number {
  if (ispS <= 0 || wetMass <= 0 || dryMass <= 0 || wetMass < dryMass) return 0;
  return (ispS * G0 * Math.log(wetMass / dryMass)) / 1000;
}

/** Propellant mass (same units as mass) needed to deliver Δv (km/s) from the given starting mass. */
export function propellantFor(deltaVKms: number, ispS: number, startMass: number): number {
  if (ispS <= 0) return Number.POSITIVE_INFINITY;
  return startMass * (1 - Math.exp(-(deltaVKms * 1000) / (ispS * G0)));
}

/** Surface gravity in Earth g from mass and radius in Earth units. */
export function surfaceGravity(massEarth: number, radiusEarth: number): number {
  return massEarth / (radiusEarth * radiusEarth);
}

/** Escape velocity in km/s from mass and radius in Earth units. */
export function escapeVelocity(massEarth: number, radiusEarth: number): number {
  return EARTH_ESCAPE_KMS * Math.sqrt(massEarth / radiusEarth);
}

/** Thrust-to-weight ratio. thrust in kN, mass in tonnes, gravity in Earth g. */
export function thrustToWeight(thrustKN: number, massT: number, gravityG = 1): number {
  const weightKN = massT * G0 * gravityG;
  return weightKN > 0 ? thrustKN / weightKN : 0;
}

export function parsecsToLightYears(pc: number): number {
  return pc * PC_TO_LY;
}

export function commsTierFor(distanceLy: number): 1 | 2 | 3 {
  if (distanceLy < COMMS_TIER_LIMITS_LY.tier1) return 1;
  if (distanceLy < COMMS_TIER_LIMITS_LY.tier2) return 2;
  return 3;
}

/** GAME MODEL atmosphere class. The archive has no atmosphere data for most planets. */
export function classifyAtmosphere(
  radiusEarth: number,
  gravityG: number,
  eqTempK: number,
): AtmosphereClass {
  const r = ATMOSPHERE_RULES;
  if (eqTempK > r.scorchingAboveK) return 'scorching';
  if (eqTempK < r.frozenBelowK) return 'frozen';
  if (gravityG < r.thinBelowGravityG || radiusEarth < r.thinBelowRadius) return 'thin';
  if (radiusEarth > r.thickAboveRadius || gravityG > r.thickAboveGravityG) return 'thick';
  return 'earthlike';
}

export function kelvinToCelsius(k: number): number {
  return k - 273.15;
}
