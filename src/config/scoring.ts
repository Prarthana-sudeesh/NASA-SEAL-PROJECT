// Scoring weights and bands. Max base score = 1,000 before the astronaut multiplier.
export const SCORING = {
  mission: { max: 400, perStageCleared: 40 },
  performance: {
    max: 150,
    /** Ideal Δv / TWR margin band (fraction above requirement). */
    idealMin: 0.05,
    idealMax: 0.25,
    /** Margin beyond which over-engineering scores zero for that half. */
    overMax: 1.5,
  },
  budget: {
    max: 150,
    idealMinFrac: 0.7,
    idealMaxFrac: 1.0,
    /** Score reaches 0 at this overspend fraction. */
    zeroAtOverspend: 0.15,
    /** Underspend below idealMin loses up to this many points, only when the mission failed. */
    underspendFailPenalty: 60,
    /** Small penalty for extreme underspend even on success (encourages using resources). */
    underspendSuccessPenalty: 15,
  },
  selection: { max: 150 },
  resources: {
    max: 150,
    idealFuelMin: 0.02,
    idealFuelMax: 0.2,
  },
  crew: {
    successBonusPerAstronaut: 0.1,
    failurePenaltyPerAstronaut: 60,
  },
} as const;
