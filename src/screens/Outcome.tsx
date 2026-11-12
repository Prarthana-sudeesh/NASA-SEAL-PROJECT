import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ATTEMPTS_PER_RUN } from '../config/difficulty.ts';
import { SCORING } from '../config/scoring.ts';
import { ProgressTracker, STAGE_LABELS } from '../components/ProgressTracker.tsx';
import { PlanetVisual } from '../components/PlanetVisual.tsx';
import { getPlanet } from '../data/planets.ts';
import type { AttemptScore, DebriefItem } from '../data/types.ts';
import { averageScore } from '../engine/scoring.ts';
import { currentAttempt, useGame } from '../store/gameStore.ts';
import { ScreenMissing } from './ScreenMissing.tsx';

export const CATEGORIES: { key: keyof AttemptScore; label: string; max: number }[] = [
  { key: 'mission', label: 'Mission success', max: SCORING.mission.max },
  { key: 'performance', label: 'Rocket performance', max: SCORING.performance.max },
  { key: 'budget', label: 'Budget efficiency', max: SCORING.budget.max },
  { key: 'selection', label: 'Component selection', max: SCORING.selection.max },
  { key: 'resources', label: 'Resource management', max: SCORING.resources.max },
];

const DEBRIEF_STYLE: Record<DebriefItem['kind'], { icon: string; cls: string; label: string }> = {
  cause: { icon: '✕', cls: 'border-bad/40 bg-bad/10', label: 'What went wrong or cost points' },
  good: { icon: '✓', cls: 'border-ok/40 bg-ok/10', label: 'What worked' },
  tip: { icon: '💡', cls: 'border-accent/50 bg-accent/10', label: 'What to try next time' },
};

export function ScoreBreakdown({ score }: { score: AttemptScore }) {
  const data = CATEGORIES.map((c) => ({
    name: c.label,
    earned: score[c.key] as number,
    rest: c.max - (score[c.key] as number),
    max: c.max,
  }));
  return (
    <div>
      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
          >
            <XAxis
              type="number"
              domain={[0, 400]}
              tick={{ fill: '#aab6d3', fontSize: 11 }}
              stroke="#3a4c80"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fill: '#eef2fb', fontSize: 12 }}
              stroke="#3a4c80"
            />
            <Bar dataKey="earned" stackId="a" isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.name}
                  fill={
                    d.earned / d.max >= 0.8
                      ? '#3ddc84'
                      : d.earned / d.max >= 0.4
                        ? '#ffc23d'
                        : '#ff6b6b'
                  }
                />
              ))}
            </Bar>
            <Bar dataKey="rest" stackId="a" fill="#24345f" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Score breakdown</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.name} className="border-b border-space-700">
              <th scope="row" className="py-1 text-left font-normal text-muted">
                {d.name}
              </th>
              <td className="py-1 text-right font-semibold tabular-nums">
                {d.earned} / {d.max}
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-1 text-left">
              Base score
            </th>
            <td className="py-1 text-right font-bold tabular-nums">{score.base} / 1000</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Outcome() {
  const { run, go, selectPlanet, nextAttempt } = useGame();
  const attempt = run ? currentAttempt(run) : undefined;
  const planet = getPlanet(attempt?.planetId);
  if (!run || !attempt || !planet) return <ScreenMissing what="a completed mission" />;
  const { result, score } = attempt;
  const avg = averageScore(run.attempts.map((a) => a.score.total));
  const last = run.attempts.length >= ATTEMPTS_PER_RUN;

  return (
    <div className="flex flex-col gap-4">
      <header
        className={`panel flex flex-col items-center gap-4 p-5 sm:flex-row ${result.success ? 'border-ok/60' : 'border-bad/60'}`}
      >
        <PlanetVisual planet={planet} size={96} decorative />
        <div className="flex-1">
          <p className="eyebrow">
            Stage 8 · Mission {attempt.n} / {ATTEMPTS_PER_RUN} · {planet.name}
          </p>
          <h1
            className={`text-3xl font-black ${result.success ? 'text-ok' : 'text-bad'}`}
            aria-live="polite"
          >
            {result.success ? '✓ Mission success!' : '✕ Mission failed'}
          </h1>
          <p className="text-muted">
            {result.success
              ? 'Your rocket made the full round trip: Earth → planet → Earth.'
              : `Stage reached: ${STAGE_LABELS[result.stageReached]} (${result.stagesCleared} of 9 stages cleared).`}
          </p>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted">Score</div>
          <div className="text-5xl font-black text-accent tabular-nums">{score.total}</div>
          <div className="text-xs text-muted tabular-nums">
            Running average {avg} · {run.attempts.length}/{ATTEMPTS_PER_RUN}
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel p-4" aria-labelledby="debrief-h">
          <h2 id="debrief-h" className="mb-2 text-xl font-bold">
            Engineering debrief
          </h2>
          <ul className="flex flex-col gap-2">
            {attempt.debrief.map((d, i) => {
              const s = DEBRIEF_STYLE[d.kind];
              return (
                <li
                  key={i}
                  className={`flex gap-2 rounded-lg border p-2 text-sm leading-relaxed ${s.cls}`}
                >
                  <span aria-hidden="true" className="text-base">
                    {s.icon}
                  </span>
                  <span>
                    <span className="sr-only">{s.label}: </span>
                    {d.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="panel p-4" aria-labelledby="score-h">
          <h2 id="score-h" className="mb-2 text-xl font-bold">
            Score breakdown
          </h2>
          <ScoreBreakdown score={score} />
          <div
            className={`mt-3 rounded-lg border p-2 text-sm ${score.crew === 0 ? 'border-space-600' : result.success ? 'border-ok/50 bg-ok/10' : 'border-bad/50 bg-bad/10'}`}
          >
            <strong>Astronaut multiplier: </strong>
            {score.crew === 0 ? (
              'No crew on board: ×1.0.'
            ) : result.success ? (
              <>
                {score.crew} crew home safely: {score.base} × {score.crewMultiplier.toFixed(1)} ={' '}
                <strong className="text-ok">{score.total}</strong>
              </>
            ) : (
              <>
                {score.crew} crew lost: {score.base} − {SCORING.crew.failurePenaltyPerAstronaut} ×{' '}
                {score.crew} = <strong className="text-bad">{score.total}</strong>
              </>
            )}
          </div>
        </section>
      </div>

      <section className="panel p-4" aria-label="Stages reached">
        <h2 className="eyebrow mb-2">Mission status</h2>
        <ProgressTracker
          current={result.stageReached}
          failedAt={result.failedAt}
          done
          orientation="horizontal"
        />
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        {last ? (
          <button type="button" className="btn btn-primary text-lg" onClick={() => go('summary')}>
            See campaign summary →
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                selectPlanet(planet.id);
                go('builder');
              }}
            >
              Fly to {planet.name} again
            </button>
            <button type="button" className="btn btn-primary" onClick={nextAttempt}>
              Next mission ({run.attempts.length + 1}/{ATTEMPTS_PER_RUN}) →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
