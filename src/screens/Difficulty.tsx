import { ATTEMPTS_PER_RUN, DIFFICULTY } from '../config/difficulty.ts';
import { planetsFor } from '../data/planets.ts';
import { DIFFICULTIES } from '../data/types.ts';
import { useGame } from '../store/gameStore.ts';

export function Difficulty() {
  const { run, startRun, go, playerName } = useGame();
  const inProgress = run && run.attempts.length < ATTEMPTS_PER_RUN ? run : null;
  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Stage 2</p>
        <h1 className="text-3xl font-bold">Choose your difficulty</h1>
        <p className="text-muted">
          Welcome, <strong className="text-ink">{playerName || 'engineer'}</strong>. Harder
          campaigns add new engineering systems, not just tighter budgets. Each campaign is{' '}
          {ATTEMPTS_PER_RUN} missions.
        </p>
      </header>

      {inProgress && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 border-accent/60 p-4">
          <div>
            <div className="font-semibold">Campaign in progress</div>
            <div className="text-sm text-muted">
              {DIFFICULTY[inProgress.difficulty].label}: {inProgress.attempts.length} /{' '}
              {ATTEMPTS_PER_RUN} missions flown. Starting a new campaign abandons it.
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => go('planets')}>
            Continue campaign →
          </button>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-3">
        {DIFFICULTIES.map((d) => {
          const cfg = DIFFICULTY[d];
          const n = planetsFor(d).length;
          return (
            <li key={d} className="panel flex flex-col gap-3 p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-bold">{cfg.label}</h2>
                <span className="text-sm font-semibold text-accent-soft tabular-nums">
                  {cfg.budget.toLocaleString()} credits
                </span>
              </div>
              <p className="text-sm text-muted">
                {cfg.planetSummary} ({n} planets)
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {cfg.newMechanics.map((m) => (
                  <li key={m} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ▸
                    </span>
                    {m}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-primary mt-auto"
                onClick={() => {
                  if (
                    inProgress &&
                    !window.confirm('Abandon your current campaign and start a new one?')
                  )
                    return;
                  startRun(d);
                }}
              >
                Start {cfg.label} campaign
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
