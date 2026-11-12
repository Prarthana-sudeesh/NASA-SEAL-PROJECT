// GAME MODEL physics constants. All gameplay physics tuning lives here.
import type { AtmosphereClass } from '../data/types.ts';

/** Standard gravity, m/s². */
export const G0 = 9.81;

/** Parsec → light-year. */
export const PC_TO_LY = 3.26156;

/** Escape velocity of Earth in km/s; v_esc = 11.19 × √(M/R) in Earth units. */
export const EARTH_ESCAPE_KMS = 11.19;

/**
 * Raw Δv legs (km/s) before scaling. Real interstellar trips are impossible with these engines,
 * so every leg is multiplied by GAME_DV_SCALE to keep missions playable while preserving the
 * relative difficulty between planets. Tuned with `npm run balance-check`.
 */
export const DV = {
  earthLaunch: 9.4,
  transitBase: 3,
  transitPerLog10Ly: 2,
  landingPerEscape: 0.6,
  ascentPerEscape: 0.6,
  earthReturn: 1.5,
} as const;

export const GAME_DV_SCALE = 0.18;

export const MIN_LIFTOFF_TWR = 1.2;
export const MIN_ASCENT_TWR = 1.2;

/** A check passes with a warning when the margin is below this fraction. */
export const WARN_MARGIN = 0.05;

/** Comms range tiers by distance (light-years). */
export const COMMS_TIER_LIMITS_LY = { tier1: 15, tier2: 60 } as const;

/** Required pressure rating (atm) by atmosphere class. */
export const PRESSURE_BY_ATMOSPHERE: Record<AtmosphereClass, number> = {
  thin: 1,
  earthlike: 1,
  frozen: 3,
  scorching: 3,
  thick: 10,
};

/** Atmosphere classification thresholds (GAME MODEL). */
export const ATMOSPHERE_RULES = {
  scorchingAboveK: 600,
  frozenBelowK: 180,
  thinBelowGravityG: 0.75,
  thinBelowRadius: 0.85,
  thickAboveRadius: 1.6,
  thickAboveGravityG: 1.5,
} as const;

/** Required life-support days for crewed missions on Hard (GAME MODEL). */
export const LIFE_SUPPORT = { baseDays: 60, daysPerLog10Ly: 40 } as const;

/** Over-budget allowance before launch is blocked. */
export const MAX_OVERSPEND = 0.15;

export const ATMOSPHERE_INFO: Record<AtmosphereClass, { label: string; summary: string }> = {
  thin: {
    label: 'Thin / None',
    summary: 'Little or no air. Keep the cabin pressurised against the vacuum outside.',
  },
  earthlike: {
    label: 'Earth-like',
    summary: 'A temperate, moderate atmosphere might be possible here.',
  },
  thick: {
    label: 'Thick',
    summary: 'A large, heavy world that could hold a crushing envelope of gas.',
  },
  scorching: {
    label: 'Scorching',
    summary: 'Searing heat, possibly vaporised rock in the sky.',
  },
  frozen: {
    label: 'Frozen',
    summary: 'Bitterly cold, with dense frozen gases possible near the surface.',
  },
};
