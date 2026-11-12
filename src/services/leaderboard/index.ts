import type { LeaderboardService } from './LeaderboardService.ts';
import { LocalLeaderboardService } from './LocalLeaderboardService.ts';
import { RemoteLeaderboardService } from './RemoteLeaderboardService.ts';

export type { LeaderboardService } from './LeaderboardService.ts';

let instance: LeaderboardService | null = null;

/**
 * Choose storage with Vite env vars:
 *   VITE_LEADERBOARD=remote VITE_LEADERBOARD_URL=… VITE_LEADERBOARD_KEY=…
 * Defaults to the offline LocalLeaderboardService.
 */
export function getLeaderboardService(): LeaderboardService {
  if (instance) return instance;
  const env = import.meta.env;
  instance =
    env.VITE_LEADERBOARD === 'remote' && env.VITE_LEADERBOARD_URL
      ? new RemoteLeaderboardService(env.VITE_LEADERBOARD_URL, env.VITE_LEADERBOARD_KEY ?? '')
      : new LocalLeaderboardService();
  return instance;
}

export function setLeaderboardService(service: LeaderboardService) {
  instance = service;
}
