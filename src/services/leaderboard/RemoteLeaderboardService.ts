import type { Difficulty, LeaderboardEntry } from '../../data/types.ts';
import type { LeaderboardService, NewLeaderboardEntry } from './LeaderboardService.ts';
import { LEADERBOARD_LIMIT } from './LeaderboardService.ts';

/**
 * Stub for a hosted leaderboard (Supabase, Firebase, or any REST backend).
 * Not wired to a backend yet. See README "Leaderboard storage" for how to switch.
 *
 * Expected table/collection: leaderboard(id, name, difficulty, average, best,
 * planets_visited text[], date timestamptz). Use row-level security so clients can only insert.
 */
export class RemoteLeaderboardService implements LeaderboardService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async list(difficulty: Difficulty, limit = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
    void difficulty;
    void limit;
    void this.baseUrl;
    void this.apiKey;
    // Example (Supabase REST):
    // fetch(`${this.baseUrl}/rest/v1/leaderboard?difficulty=eq.${difficulty}&order=average.desc&limit=${limit}`,
    //   { headers: { apikey: this.apiKey, Authorization: `Bearer ${this.apiKey}` } })
    throw new Error('Remote leaderboard is not configured.');
  }

  async submit(entry: NewLeaderboardEntry): Promise<LeaderboardEntry> {
    void entry;
    throw new Error('Remote leaderboard is not configured.');
  }
}
