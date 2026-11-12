// Shared online leaderboard for the hosted claude.ai version of the game.
// Uses the artifact's shared database (declared with the `db` and `user` capabilities when
// publishing). One document per player at scores/<viewerId>, holding their best campaign per
// difficulty. Everyone who can open the game reads all rows; each player writes only their own.
import type { Difficulty, LeaderboardEntry } from '../../data/types.ts';
import type { LeaderboardService, NewLeaderboardEntry } from './LeaderboardService.ts';
import { LEADERBOARD_LIMIT, sortEntries } from './LeaderboardService.ts';

// Minimal shapes of the claude.ai runtime APIs this service uses.
interface DocSnap {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<DocSnap>;
  set(data: Record<string, unknown>): Promise<void>;
}
interface Collection {
  doc(id: string): DocRef;
  get(): Promise<{ docs: DocSnap[] }>;
}
export interface ArtifactDb {
  collection(path: string): Collection;
}
export interface ArtifactUser {
  id(): Promise<string | null>;
}

interface StoredRun {
  average: number;
  best: number;
  planetsVisited: string[];
  date: string;
}

const COLLECTION = 'scores';
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

function parseRun(v: unknown): StoredRun | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  if (typeof r.average !== 'number' || typeof r.best !== 'number') return null;
  return {
    average: r.average,
    best: r.best,
    planetsVisited: Array.isArray(r.planetsVisited)
      ? r.planetsVisited.filter((x): x is string => typeof x === 'string').slice(0, 20)
      : [],
    date: typeof r.date === 'string' ? r.date : new Date(0).toISOString(),
  };
}

export class SharedArtifactLeaderboardService implements LeaderboardService {
  readonly kind = 'shared' as const;
  private readonly db: ArtifactDb;
  private readonly user: ArtifactUser;

  constructor(db: ArtifactDb, user: ArtifactUser) {
    this.db = db;
    this.user = user;
  }

  async list(difficulty: Difficulty, limit = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
    const snap = await this.db.collection(COLLECTION).get();
    const rows: LeaderboardEntry[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data) continue;
      const run = parseRun(data[difficulty]);
      // Shared data is untrusted: keep names short and plain.
      const name = typeof data.name === 'string' ? data.name.slice(0, 16) : 'Player';
      if (run) rows.push({ id: `${doc.id}:${difficulty}`, name, difficulty, ...run });
    }
    return sortEntries(rows).slice(0, limit);
  }

  /** Keeps each player's best average per difficulty. */
  async submit(entry: NewLeaderboardEntry): Promise<LeaderboardEntry> {
    const viewer = await this.user.id();
    if (!viewer) throw new Error('Sign in to claude.ai to post to the shared leaderboard.');
    const ref = this.db.collection(COLLECTION).doc(viewer);
    const current = (await ref.get()).data() ?? {};
    const next: Record<string, unknown> = { name: entry.name };
    for (const d of DIFFS) {
      const prev = parseRun(current[d]);
      if (prev) next[d] = prev;
    }
    const prev = parseRun(current[entry.difficulty]);
    if (!prev || entry.average >= prev.average) {
      next[entry.difficulty] = {
        average: entry.average,
        best: entry.best,
        planetsVisited: entry.planetsVisited,
        date: entry.date,
      };
    }
    try {
      await ref.set(next);
    } catch {
      throw new Error(
        'Couldn’t post to the shared leaderboard. Ask the game’s owner for “can interact” access, then retry.',
      );
    }
    const saved = parseRun(next[entry.difficulty])!;
    return {
      id: `${viewer}:${entry.difficulty}`,
      name: entry.name,
      difficulty: entry.difficulty,
      ...saved,
    };
  }
}
