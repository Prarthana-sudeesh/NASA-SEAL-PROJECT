// Shared physics constants used by the planet data pipeline (GAME MODEL where noted).
import type { AtmosphereClass } from '../data/types.ts';

/** Standard gravity, m/s². */
export const G0 = 9.81;

/** Parsec → light-year. */
export const PC_TO_LY = 3.26156;

/** Escape velocity of Earth in km/s; v_esc = 11.19 × √(M/R) in Earth units. */
export const EARTH_ESCAPE_KMS = 11.19;

/** Comms range tiers by distance (light-years). */
export const COMMS_TIER_LIMITS_LY = { tier1: 15, tier2: 60 } as const;

/** Atmosphere classification thresholds (GAME MODEL). */
export const ATMOSPHERE_RULES = {
  scorchingAboveK: 600,
  frozenBelowK: 180,
  thinBelowGravityG: 0.75,
  thinBelowRadius: 0.85,
  thickAboveRadius: 1.6,
  thickAboveGravityG: 1.5,
} as const;

export const ATMOSPHERE_INFO: Record<AtmosphereClass, { label: string; summary: string }> = {
  thin: {
    label: 'Thin / None',
    summary: 'Little or no air. Keep the cabin pressurised against the vacuum.',
  },
  earthlike: {
    label: 'Earth-like',
    summary: 'A temperate, moderate atmosphere might be possible here.',
  },
  thick: {
    label: 'Thick',
    summary: 'A large, heavy world that could hold a crushing envelope of gas.',
  },
  scorching: { label: 'Scorching', summary: 'Searing heat, possibly vaporised rock in the sky.' },
  frozen: {
    label: 'Frozen',
    summary: 'Bitterly cold, with dense frozen gases possible near the surface.',
  },
};
