import { LocalLeaderboardService } from './leaderboard/LocalLeaderboardService.ts';
import { validateName } from './nameValidation.ts';

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
