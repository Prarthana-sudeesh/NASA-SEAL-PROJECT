import type { Difficulty, LeaderboardEntry } from '../../data/types.ts';
import { uid } from '../../store/persistence.ts';
import type { LeaderboardService, NewLeaderboardEntry } from './LeaderboardService.ts';
import { LEADERBOARD_LIMIT, sortEntries } from './LeaderboardService.ts';

const KEY = 'rocket-builder:leaderboard';
/** Keep storage bounded. */
const MAX_STORED_PER_DIFFICULTY = 200;

/** Offline leaderboard kept in this browser's localStorage. */
export class LocalLeaderboardService implements LeaderboardService {
  readonly kind = 'local' as const;
  private readonly key: string;

  constructor(key = KEY) {
    this.key = key;
  }

  private read(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('bad');
      return parsed.filter(
        (e): e is LeaderboardEntry =>
          !!e &&
          typeof e.id === 'string' &&
          typeof e.average === 'number' &&
          typeof e.name === 'string',
      );
    } catch {
      localStorage.removeItem(this.key);
      return [];
    }
  }

  private write(entries: LeaderboardEntry[]) {
    try {
      localStorage.setItem(this.key, JSON.stringify(entries));
    } catch {
      throw new Error('Could not save to this browser’s storage.');
    }
  }

  async list(difficulty: Difficulty, limit = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
    return sortEntries(this.read().filter((e) => e.difficulty === difficulty)).slice(0, limit);
  }

  async submit(entry: NewLeaderboardEntry): Promise<LeaderboardEntry> {
    const full: LeaderboardEntry = { ...entry, id: uid() };
    const all = this.read();
    all.push(full);
    const kept = (['easy', 'medium', 'hard'] as Difficulty[]).flatMap((d) =>
      sortEntries(all.filter((e) => e.difficulty === d)).slice(0, MAX_STORED_PER_DIFFICULTY),
    );
    this.write(kept);
    return full;
  }
}
