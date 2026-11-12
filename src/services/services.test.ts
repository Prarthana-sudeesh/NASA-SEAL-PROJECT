import { LocalLeaderboardService } from './leaderboard/LocalLeaderboardService.ts';
import { validateName } from './nameValidation.ts';
import { SharedArtifactLeaderboardService } from './leaderboard/SharedArtifactLeaderboardService.ts';

describe('name validation', () => {
  it('enforces 2–16 characters', () => {
    expect(validateName('A').ok).toBe(false);
    expect(validateName('  Ace  ').value).toBe('Ace');
    expect(validateName('Ace').ok).toBe(true);
    expect(validateName('x'.repeat(17)).ok).toBe(false);
    expect(validateName('x'.repeat(16)).ok).toBe(true);
  });
  it('filters profanity including simple leetspeak', () => {
    expect(validateName('sh1tpilot').ok).toBe(false);
    expect(validateName('Captain Nova').ok).toBe(true);
    expect(validateName('<script>').ok).toBe(false);
  });
});

describe('LocalLeaderboardService', () => {
  const entry = (name: string, average: number, difficulty: 'easy' | 'hard' = 'easy') => ({
    name,
    average,
    best: average + 50,
    difficulty,
    planetsVisited: ['Proxima Cen b'],
    date: '2026-11-12T00:00:00Z',
  });

  it('stores entries per difficulty, sorted by average', async () => {
    const svc = new LocalLeaderboardService('test-lb');
    await svc.submit(entry('Low', 100));
    await svc.submit(entry('High', 900));
    await svc.submit(entry('Hardy', 500, 'hard'));
    const easy = await svc.list('easy');
    expect(easy.map((e) => e.name)).toEqual(['High', 'Low']);
    expect((await svc.list('hard')).map((e) => e.name)).toEqual(['Hardy']);
  });

  it('caps at the top N and survives corrupt storage', async () => {
    const svc = new LocalLeaderboardService('test-lb2');
    for (let i = 0; i < 25; i++) await svc.submit(entry(`P${i}`, i));
    expect((await svc.list('easy')).length).toBe(20);
    localStorage.setItem('test-lb2', '{not json');
    expect(await svc.list('easy')).toEqual([]);
  });
});

describe('SharedArtifactLeaderboardService', () => {
  // In-memory stand-in for the claude.ai shared database.
  function fakeDb() {
    const docs = new Map<string, Record<string, unknown>>();
    const snap = (id: string) => ({ id, exists: docs.has(id), data: () => docs.get(id) });
    return {
      docs,
      collection: () => ({
        doc: (id: string) => ({
          get: async () => snap(id),
          set: async (d: Record<string, unknown>) => void docs.set(id, d),
        }),
        get: async () => ({ docs: [...docs.keys()].map(snap) }),
      }),
    };
  }
  const run = (average: number, difficulty: 'easy' | 'hard' = 'easy') => ({
    name: 'Ace',
    difficulty,
    average,
    best: average + 10,
    planetsVisited: ['Proxima Cen b'],
    date: '2026-11-12T00:00:00Z',
  });

  it('keeps each player’s best average per difficulty and shares it with everyone', async () => {
    const db = fakeDb();
    const me = new SharedArtifactLeaderboardService(db, { id: async () => 'u1' });
    const friend = new SharedArtifactLeaderboardService(db, { id: async () => 'u2' });
    await me.submit(run(700));
    await me.submit(run(500)); // worse: ignored
    await me.submit(run(900, 'hard'));
    await friend.submit({ ...run(800), name: 'Bo' });
    const easy = await friend.list('easy');
    expect(easy.map((e) => [e.name, e.average])).toEqual([
      ['Bo', 800],
      ['Ace', 700],
    ]);
    expect((await me.list('hard'))[0]).toMatchObject({ id: 'u1:hard', average: 900 });
  });

  it('explains when posting is not allowed', async () => {
    const db = fakeDb();
    const blocked = {
      collection: () => ({
        ...db.collection(),
        doc: () => ({
          get: async () => ({ id: 'x', exists: false, data: () => undefined }),
          set: async () => Promise.reject(new Error('x')),
        }),
      }),
    };
    const svc = new SharedArtifactLeaderboardService(blocked, { id: async () => 'u1' });
    await expect(svc.submit(run(1))).rejects.toThrow(/can interact/);
    const anon = new SharedArtifactLeaderboardService(db, { id: async () => null });
    await expect(anon.submit(run(1))).rejects.toThrow(/Sign in/);
  });
});
