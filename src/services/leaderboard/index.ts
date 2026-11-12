import type { LeaderboardService } from './LeaderboardService.ts';
import { LocalLeaderboardService } from './LocalLeaderboardService.ts';
import { RemoteLeaderboardService } from './RemoteLeaderboardService.ts';
import {
  SharedArtifactLeaderboardService,
  type ArtifactDb,
  type ArtifactUser,
} from './SharedArtifactLeaderboardService.ts';

export type { LeaderboardService } from './LeaderboardService.ts';

let instance: Promise<LeaderboardService> | null = null;

type ClaudeRuntime = { use(name: string): Promise<unknown> };

async function pick(): Promise<LeaderboardService> {
  // 1. Hosted on claude.ai: use the artifact's shared database (everyone sees everyone).
  const claude = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (claude && typeof claude.use === 'function') {
    try {
      const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
      if (db && user)
        return new SharedArtifactLeaderboardService(db as ArtifactDb, user as ArtifactUser);
    } catch {
      /* fall through to local */
    }
  }
  // 2. A hosted backend configured through Vite env vars (see README).
  const env = import.meta.env;
  if (env.VITE_LEADERBOARD === 'remote' && env.VITE_LEADERBOARD_URL) {
    return new RemoteLeaderboardService(env.VITE_LEADERBOARD_URL, env.VITE_LEADERBOARD_KEY ?? '');
  }
  // 3. Offline: this browser only.
  return new LocalLeaderboardService();
}

/** Resolves the best available leaderboard: shared (claude.ai), remote, or this device. */
export function getLeaderboardService(): Promise<LeaderboardService> {
  instance ??= pick();
  return instance;
}

export function setLeaderboardService(service: LeaderboardService) {
  instance = Promise.resolve(service);
}
