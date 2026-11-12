import { useEffect, useState } from 'react';
import { DIFFICULTY } from '../config/difficulty.ts';
import type { Difficulty, LeaderboardEntry } from '../data/types.ts';
import { DIFFICULTIES } from '../data/types.ts';
import { LEADERBOARD_LIMIT } from '../services/leaderboard/LeaderboardService.ts';
import { getLeaderboardService } from '../services/leaderboard/index.ts';
import { useGame } from '../store/gameStore.ts';
import { useSettings } from '../store/settingsStore.ts';

type Load =
  | { status: 'loading' }
  | { status: 'ready'; entries: LeaderboardEntry[] }
  | { status: 'error'; message: string };

export function Leaderboard() {
  const { run, closeAside } = useGame();
  const mine = useSettings((s) => s.myEntryIds);
  const [tab, setTab] = useState<Difficulty>(run?.difficulty ?? 'easy');
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ status: 'loading' });
    getLeaderboardService()
      .list(tab, LEADERBOARD_LIMIT)
      .then((entries) => alive && setLoad({ status: 'ready', entries }))
      .catch(
        (e: unknown) =>
          alive &&
          setLoad({
            status: 'error',
            message: e instanceof Error ? e.message : 'Could not load leaderboard.',
          }),
      );
    return () => {
      alive = false;
    };
  }, [tab, reload]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Repeat &amp; compete</p>
          <h1 className="text-3xl font-bold">Leaderboards</h1>
          <p className="text-sm text-muted">
            Ranked by the average of 10 missions: consistency beats one lucky launch. Top{' '}
            {LEADERBOARD_LIMIT} per difficulty.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={closeAside}>
          ← Back
        </button>
      </header>
      <div role="tablist" aria-label="Difficulty" className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={tab === d}
            aria-controls="lb-panel"
            tabIndex={tab === d ? 0 : -1}
            onClick={() => setTab(d)}
            onKeyDown={(e) => {
              const i = DIFFICULTIES.indexOf(tab);
              if (e.key === 'ArrowRight') setTab(DIFFICULTIES[(i + 1) % 3]);
              if (e.key === 'ArrowLeft') setTab(DIFFICULTIES[(i + 2) % 3]);
            }}
            className={`rounded-lg px-4 py-2 font-semibold ${tab === d ? 'bg-accent text-space-950' : 'bg-space-800 text-muted hover:text-ink'}`}
          >
            {DIFFICULTY[d].label}
          </button>
        ))}
      </div>
      <section
        id="lb-panel"
        role="tabpanel"
        className="panel overflow-x-auto p-2"
        aria-busy={load.status === 'loading'}
      >
        {load.status === 'loading' && <p className="p-4 text-muted">Loading…</p>}
        {load.status === 'error' && (
          <div className="p-4" role="alert">
            <p className="text-bad">✕ {load.message}</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-2"
              onClick={() => setReload((r) => r + 1)}
            >
              Retry
            </button>
          </div>
        )}
        {load.status === 'ready' && load.entries.length === 0 && (
          <p className="p-4 text-muted">
            No campaigns finished on {DIFFICULTY[tab].label} yet. Complete 10 missions to claim the
            top spot!
          </p>
        )}
        {load.status === 'ready' && load.entries.length > 0 && (
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">{DIFFICULTY[tab].label} leaderboard</caption>
            <thead>
              <tr className="text-left text-muted">
                <th className="p-2 font-normal">Rank</th>
                <th className="p-2 font-normal">Call-sign</th>
                <th className="p-2 text-right font-normal">Average</th>
                <th className="p-2 text-right font-normal">Best</th>
                <th className="p-2 font-normal">Planets visited</th>
                <th className="p-2 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {load.entries.map((e, i) => {
                const isMe = mine.includes(e.id);
                return (
                  <tr
                    key={e.id}
                    className={`border-t border-space-700 ${isMe ? 'bg-accent/15' : ''}`}
                    aria-current={isMe ? 'true' : undefined}
                  >
                    <td className="p-2 font-bold tabular-nums">{i + 1}</td>
                    <td className="p-2 font-semibold">
                      {e.name}
                      {isMe && (
                        <span className="ml-2 rounded bg-accent px-1 text-xs text-space-950">
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right font-bold text-accent-soft tabular-nums">
                      {e.average}
                    </td>
                    <td className="p-2 text-right tabular-nums">{e.best}</td>
                    <td
                      className="max-w-[220px] truncate p-2 text-muted"
                      title={e.planetsVisited.join(', ')}
                    >
                      {e.planetsVisited.length}: {e.planetsVisited.join(', ')}
                    </td>
                    <td className="p-2 text-muted">{new Date(e.date).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <p className="text-xs text-muted">Scores are stored in this browser (offline leaderboard).</p>
    </div>
  );
}
