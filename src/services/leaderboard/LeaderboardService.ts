import type { Difficulty, LeaderboardEntry } from '../../data/types.ts';

export type NewLeaderboardEntry = Omit<LeaderboardEntry, 'id'>;

/** Storage-agnostic leaderboard. Swap implementations in ./index.ts. */
export interface LeaderboardService {
  /** 'shared' = online for everyone; 'local' = this browser only; 'remote' = hosted backend. */
  readonly kind: 'shared' | 'local' | 'remote';
  /** Top entries for one difficulty, best average first. */
  list(difficulty: Difficulty, limit?: number): Promise<LeaderboardEntry[]>;
  submit(entry: NewLeaderboardEntry): Promise<LeaderboardEntry>;
}

export const LEADERBOARD_LIMIT = 20;

export function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort(
    (a, b) => b.average - a.average || b.best - a.best || a.date.localeCompare(b.date),
  );
}
