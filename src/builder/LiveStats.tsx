import { DIFFICULTY } from '../config/difficulty.ts';
import { MAX_OVERSPEND } from '../config/physics.ts';
import { StatusLight } from '../components/StatusLight.tsx';
import type {
  CheckId,
  CheckResult,
  CheckStatus,
  Difficulty,
  Planet,
  RocketBuild,
} from '../data/types.ts';
import { buildStats, launchBlocks } from '../engine/build.ts';
import { evaluateBuild } from '../engine/mission.ts';

const HINTS: Partial<Record<CheckId, { fail: string; ok: string }>> = {
  'total-dv': {
    fail: 'Not enough Δv for the round trip. Add fuel, or use an engine with higher Isp.',
    ok: 'Enough Δv for there and back. A 5–25% margin scores best.',
  },
  'liftoff-twr': {
    fail: 'Too heavy to lift off. Add thrust, use a stronger engine, or carry less.',
    ok: 'Enough thrust to leave the pad.',
  },
  'ascent-twr': {
    fail: 'Too weak to climb out of this planet’s gravity. More thrust or less mass.',
    ok: 'Can take off again from the surface.',
  },
  comms: {
    fail: 'Antenna can’t reach this distance. Upgrade the comms tier.',
    ok: 'Earth stays in contact.',
  },
  pressure: {
    fail: 'Pressure tank rating is too low for this atmosphere.',
    ok: 'Hull holds the surface pressure.',
  },
  protection: {
    fail: 'Protection doesn’t cover this planet’s temperature.',
    ok: 'Temperature is in the safe range.',
  },
  'life-support': {
    fail: 'Crew would run out of supplies. Bigger payload or fewer days.',
    ok: 'Crew supplies last the trip.',
  },
};

const SHOWN: CheckId[] = [
  'total-dv',
  'liftoff-twr',
  'ascent-twr',
  'comms',
  'pressure',
  'protection',
  'life-support',
];

function fmt(v: number | string, unit?: string) {
  return `${typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v}${unit ? ` ${unit}` : ''}`;
}

function Bar({
  value,
  max,
  marks,
  status,
}: {
  value: number;
  max: number;
  marks: number[];
  status: CheckStatus | 'neutral';
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    status === 'fail'
      ? 'bg-bad'
      : status === 'warn'
        ? 'bg-warn'
        : status === 'pass'
          ? 'bg-ok'
          : 'bg-accent';
  return (
    <div className="relative mt-1 h-2 rounded-full bg-space-700" aria-hidden="true">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      {marks.map((m) => (
        <div
          key={m}
          className="absolute top-[-3px] h-[14px] w-0.5 bg-ink"
          style={{ left: `${Math.min(100, (m / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

interface Props {
  build: RocketBuild;
  planet: Planet;
  difficulty: Difficulty;
}

/** Live totals (weight, cost, Δv, TWR) plus requirement status, with hints per difficulty. */
export function LiveStats({ build, planet, difficulty }: Props) {
  const cfg = DIFFICULTY[difficulty];
  const ev = evaluateBuild(build, planet, difficulty);
  const req = ev.requirements;
  const stats = buildStats(build, req);
  const blocks = launchBlocks(build, difficulty);
  const over = stats.cost > cfg.budget;
  const limit = Math.floor(cfg.budget * (1 + MAX_OVERSPEND));
  const showStatus = cfg.hints !== 'none';
  const byId = new Map<CheckId, CheckResult>(ev.checks.map((c) => [c.id, c]));
  const costStatus: CheckStatus = stats.cost > limit ? 'fail' : over ? 'warn' : 'pass';

  return (
    <section aria-label="Live rocket statistics" className="panel flex flex-col gap-3 p-3">
      <h2 className="text-lg font-bold">Live stats</h2>

      <div>
        <div className="flex items-center justify-between text-sm">
          <span>Cost</span>
          <span className="tabular-nums">
            <strong className={stats.cost > limit ? 'text-bad' : over ? 'text-warn' : ''}>
              {stats.cost}
            </strong>{' '}
            / {cfg.budget} cr
          </span>
        </div>
        <Bar
          value={stats.cost}
          max={limit * 1.05}
          marks={[cfg.budget, limit]}
          status={costStatus}
        />
        {over && (
          <p className="mt-1 text-xs text-warn">
            !{' '}
            {stats.cost > limit
              ? `Over the ${limit} cr hard limit: launch blocked.`
              : 'Over budget: allowed up to +15%, but it costs budget points.'}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted">Mass (wet)</dt>
          <dd className="font-semibold tabular-nums">{stats.wetMassT} t</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Dry / fuel</dt>
          <dd className="font-semibold tabular-nums">
            {stats.dryMassT} / {stats.fuelT} t
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Δv available</dt>
          <dd className="font-semibold tabular-nums">{stats.deltaVKms} km/s</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Lift-off TWR</dt>
          <dd className="font-semibold tabular-nums">{stats.liftoffTWR}</dd>
        </div>
      </dl>

      <div>
        <div className="flex justify-between text-xs text-muted">
          <span>Δv vs required ({req.deltaVKms} km/s)</span>
        </div>
        <Bar
          value={stats.deltaVKms}
          max={Math.max(req.deltaVKms * 1.6, stats.deltaVKms)}
          marks={[req.deltaVKms]}
          status={showStatus ? (byId.get('total-dv')?.status ?? 'fail') : 'neutral'}
        />
      </div>

      <div>
        <h3 className="eyebrow mb-1">Mission requirements</h3>
        {!showStatus && (
          <p className="mb-1 text-xs text-muted">
            Hard mode: no live hints. Compare the numbers yourself. The debrief explains the result.
          </p>
        )}
        <ul className="flex flex-col gap-1.5">
          {SHOWN.map((id) => byId.get(id))
            .filter((c): c is CheckResult => !!c)
            .map((c) => {
              const hint = HINTS[c.id];
              const showHint =
                cfg.hints === 'all' || (cfg.hints === 'failing' && c.status !== 'pass');
              return (
                <li key={c.id} className="rounded-lg bg-space-900/70 p-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold">{c.label}</span>
                    {showStatus && <StatusLight status={c.status} compact />}
                  </div>
                  <div className="text-xs text-muted tabular-nums">
                    {fmt(c.actual, c.unit)} · needs {fmt(c.required, c.unit)}
                  </div>
                  {showStatus && showHint && hint && (
                    <div
                      className={`mt-0.5 text-[0.7rem] ${c.status === 'pass' ? 'text-ok' : 'text-warn'}`}
                    >
                      {c.status === 'pass' ? hint.ok : hint.fail}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </div>

      {blocks.length > 0 && (
        <div className="rounded-lg border border-bad/50 bg-bad/10 p-2 text-xs">
          <div className="font-semibold text-bad">✕ Can’t launch yet</div>
          <ul className="ml-4 list-disc">
            {blocks.map((b) => (
              <li key={b.id}>{b.message}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
