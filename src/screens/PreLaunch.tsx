import { DIFFICULTY } from '../config/difficulty.ts';
import { RocketSvg } from '../builder/parts/RocketSvg.tsx';
import { StatCard } from '../components/StatCard.tsx';
import { StatusLight } from '../components/StatusLight.tsx';
import { STAGE_LABELS } from '../components/ProgressTracker.tsx';
import { announce } from '../components/LiveRegion.tsx';
import { getPlanet } from '../data/planets.ts';
import { buildStats, launchBlocks } from '../engine/build.ts';
import { evaluateBuild } from '../engine/mission.ts';
import { useGame } from '../store/gameStore.ts';
import { ScreenMissing } from './ScreenMissing.tsx';

const fmt = (v: number | string, unit?: string) =>
  `${typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v}${unit ? ` ${unit}` : ''}`;

export function PreLaunch() {
  const { run, planetId, build, go, launch } = useGame();
  const planet = getPlanet(planetId);
  if (!run || !planet) return <ScreenMissing what="a mission" />;
  const cfg = DIFFICULTY[run.difficulty];
  const ev = evaluateBuild(build, planet, run.difficulty);
  const req = ev.requirements;
  const stats = buildStats(build, req);
  const blocks = launchBlocks(build, run.difficulty);
  const fails = ev.checks.filter((c) => c.status === 'fail').length;
  const warns = ev.checks.filter((c) => c.status === 'warn').length;

  const doLaunch = () => {
    const a = launch();
    if (a) announce(`Launching attempt ${a.n} to ${planet.name}.`);
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Stage 6 · Launch preparation</p>
        <h1 className="text-3xl font-bold">Pre-flight review: {planet.name}</h1>
      </header>
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section
          className="panel flex flex-col items-center gap-2 p-4"
          aria-label="Assembled rocket"
        >
          <RocketSvg build={build} height={360} crew={build.crew} />
          <p className="text-center text-xs text-muted">
            {build.crew} astronaut{build.crew === 1 ? '' : 's'} on board
          </p>
        </section>
        <div className="flex flex-col gap-4">
          <section aria-label="Rocket summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              label="Total mass"
              value={stats.wetMassT}
              unit="t"
              sub={`${stats.dryMassT} t dry + ${stats.fuelT} t fuel`}
            />
            <StatCard
              label="Cost vs budget"
              value={
                <span className={stats.cost > cfg.budget ? 'text-warn' : ''}>{stats.cost}</span>
              }
              unit={`/ ${cfg.budget}`}
            />
            <StatCard
              label="Δv vs required"
              value={stats.deltaVKms}
              unit={`/ ${req.deltaVKms} km/s`}
              source="model"
            />
            <StatCard
              label="Thrust-to-weight"
              value={stats.liftoffTWR}
              unit={`/ ≥ ${req.minLiftoffTWR}`}
              source="model"
            />
            <StatCard
              label="Pressure rating"
              value={stats.pressureAtm || '-'}
              unit="atm"
              sub={req.pressureAtm ? `needs ${req.pressureAtm} atm` : 'not checked on Easy'}
            />
            <StatCard
              label="Comms range"
              value={stats.commsTier ? `Tier ${stats.commsTier}` : 'none'}
              sub={`needs tier ${req.commsTier}`}
            />
            <StatCard
              label="Protection"
              value={
                stats.protectionRange
                  ? `${stats.protectionRange[0]}–${stats.protectionRange[1]}`
                  : '-'
              }
              unit={stats.protectionRange ? 'K' : undefined}
              sub={
                req.tempRangeK
                  ? `planet ${Math.round(req.tempRangeK[0])} K`
                  : 'not checked on this difficulty'
              }
            />
            <StatCard
              label="Crew"
              value={build.crew}
              sub={stats.lifeSupportDays ? `${stats.lifeSupportDays} days life support` : undefined}
            />
          </section>

          <section className="panel p-4" aria-labelledby="checklist-h">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="checklist-h" className="text-xl font-bold">
                Pre-flight checklist
              </h2>
              <p className="text-sm text-muted">
                {fails} fail · {warns} warning · {ev.checks.length - fails - warns} pass
              </p>
            </div>
            <p className="mb-2 text-xs text-muted">
              Warnings and failures don’t stop you launching. You’re allowed to fail and learn. The
              flight stops at the first failed stage.
            </p>
            <ul className="flex flex-col gap-1">
              {ev.checks.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg bg-space-900/60 px-2 py-1.5 text-sm"
                >
                  <StatusLight status={c.status} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-xs text-muted">
                      {STAGE_LABELS[c.stage]} · {c.detail}
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    {fmt(c.actual, c.unit)}
                    <div className="text-muted">needs {fmt(c.required, c.unit)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {blocks.length > 0 && (
            <div role="alert" className="rounded-xl border border-bad/50 bg-bad/10 p-3 text-sm">
              <strong className="text-bad">✕ Launch blocked</strong>
              <ul className="ml-5 list-disc">
                {blocks.map((b) => (
                  <li key={b.id}>{b.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => go('builder')}>
              ← Back to build
            </button>
            <button
              type="button"
              className="btn btn-primary px-8 text-lg"
              onClick={doLaunch}
              disabled={blocks.length > 0}
            >
              🚀 Launch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
