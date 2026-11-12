import { useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ATTEMPTS_PER_RUN, DIFFICULTY } from '../config/difficulty.ts';
import { announce } from '../components/LiveRegion.tsx';
import { getPlanet } from '../data/planets.ts';
import { averageScore } from '../engine/scoring.ts';
import { getLeaderboardService } from '../services/leaderboard/index.ts';
import { useGame } from '../store/gameStore.ts';
import { useSettings } from '../store/settingsStore.ts';
import { ScreenMissing } from './ScreenMissing.tsx';

type SubmitState = { status: 'idle' | 'saving' | 'saved' } | { status: 'error'; message: string };

export function RunSummary() {
  const { run, markSubmitted, openAside, abandonRun } = useGame();
  const addMyEntry = useSettings((s) => s.addMyEntry);
  const [submit, setSubmit] = useState<SubmitState>({
    status: run?.submittedEntryId ? 'saved' : 'idle',
  });
  const started = useRef(false);

  const complete = !!run && run.attempts.length >= ATTEMPTS_PER_RUN;
  const totals = run?.attempts.map((a) => a.score.total) ?? [];
  const avg = averageScore(totals);
  const planetNames = [
    ...new Set(run?.attempts.map((a) => getPlanet(a.planetId)?.name ?? a.planetId) ?? []),
  ];

  const doSubmit = async () => {
    if (!run) return;
    setSubmit({ status: 'saving' });
    try {
      const entry = await getLeaderboardService().submit({
        name: run.playerName || 'Anonymous',
        difficulty: run.difficulty,
        average: avg,
        best: Math.max(...totals),
        planetsVisited: planetNames,
        date: new Date().toISOString(),
      });
      markSubmitted(entry.id);
      addMyEntry(entry.id);
      setSubmit({ status: 'saved' });
      announce(
        `Average score ${avg} submitted to the ${DIFFICULTY[run.difficulty].label} leaderboard.`,
      );
    } catch (e) {
      setSubmit({
        status: 'error',
        message: e instanceof Error ? e.message : 'Could not submit score.',
      });
    }
  };

  // Submit automatically once the 10th attempt is done.
  useEffect(() => {
    if (complete && run && !run.submittedEntryId && !started.current) {
      started.current = true;
      void doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  if (!run || run.attempts.length === 0) return <ScreenMissing what="a campaign with missions" />;
  const best = run.attempts.reduce((a, b) => (b.score.total > a.score.total ? b : a));
  const worst = run.attempts.reduce((a, b) => (b.score.total < a.score.total ? b : a));
  const successes = run.attempts.filter((a) => a.result.success).length;
  const chart = run.attempts.map((a) => ({
    n: a.n,
    score: a.score.total,
    planet: getPlanet(a.planetId)?.name ?? '',
  }));

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Stage 9 · Campaign summary · {DIFFICULTY[run.difficulty].label}</p>
        <h1 className="text-3xl font-bold">
          {complete
            ? 'Campaign complete'
            : `Campaign in progress (${run.attempts.length}/${ATTEMPTS_PER_RUN})`}
        </h1>
      </header>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Campaign results">
        <div className="panel p-4 text-center">
          <div className="text-xs text-muted">Average score</div>
          <div className="text-4xl font-black text-accent tabular-nums">{avg}</div>
        </div>
        <div className="panel p-4 text-center">
          <div className="text-xs text-muted">Best mission</div>
          <div className="text-2xl font-bold text-ok tabular-nums">{best.score.total}</div>
          <div className="text-xs text-muted">
            #{best.n} · {getPlanet(best.planetId)?.name}
          </div>
        </div>
        <div className="panel p-4 text-center">
          <div className="text-xs text-muted">Worst mission</div>
          <div className="text-2xl font-bold text-bad tabular-nums">{worst.score.total}</div>
          <div className="text-xs text-muted">
            #{worst.n} · {getPlanet(worst.planetId)?.name}
          </div>
        </div>
        <div className="panel p-4 text-center">
          <div className="text-xs text-muted">Successful round trips</div>
          <div className="text-2xl font-bold tabular-nums">
            {successes} / {run.attempts.length}
          </div>
        </div>
      </section>

      <section className="panel p-4" aria-labelledby="hist-h">
        <h2 id="hist-h" className="mb-2 text-xl font-bold">
          Mission history
        </h2>
        <div className="h-56" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="#17234a" />
              <XAxis dataKey="n" tick={{ fill: '#aab6d3', fontSize: 12 }} stroke="#3a4c80" />
              <YAxis tick={{ fill: '#aab6d3', fontSize: 12 }} stroke="#3a4c80" />
              <Tooltip
                contentStyle={{ background: '#0b1228', border: '1px solid #24345f' }}
                labelFormatter={(n) => `Mission ${n}`}
              />
              <ReferenceLine y={avg} stroke="#ff7a1a" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#7cc0ff"
                strokeWidth={2}
                dot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Scores per mission</caption>
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-normal">#</th>
              <th className="py-1 font-normal">Planet</th>
              <th className="py-1 font-normal">Result</th>
              <th className="py-1 text-right font-normal">Score</th>
            </tr>
          </thead>
          <tbody>
            {run.attempts.map((a) => (
              <tr key={a.n} className="border-t border-space-700">
                <td className="py-1 tabular-nums">{a.n}</td>
                <td className="py-1">{getPlanet(a.planetId)?.name}</td>
                <td className={`py-1 ${a.result.success ? 'text-ok' : 'text-bad'}`}>
                  {a.result.success ? '✓ Success' : `✕ ${a.result.stageReached}`}
                </td>
                <td className="py-1 text-right font-semibold tabular-nums">{a.score.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-muted">Planets visited: {planetNames.join(', ')}</p>
      </section>

      {complete && (
        <section
          className="panel flex flex-wrap items-center justify-between gap-3 p-4"
          aria-live="polite"
        >
          <div>
            {submit.status === 'saving' && 'Submitting to the leaderboard…'}
            {submit.status === 'saved' && (
              <span className="text-ok">
                ✓ Average {avg} submitted to the {DIFFICULTY[run.difficulty].label} leaderboard as “
                {run.playerName}”.
              </span>
            )}
            {submit.status === 'error' && (
              <span className="text-bad">
                ✕ {submit.message}{' '}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void doSubmit()}
                >
                  Retry
                </button>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => openAside('leaderboard')}
            >
              View leaderboard
            </button>
            <button type="button" className="btn btn-primary" onClick={abandonRun}>
              New campaign →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
