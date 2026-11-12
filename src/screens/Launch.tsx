import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SCORING } from '../config/scoring.ts';
import { AstronautIcon } from '../builder/CrewSelector.tsx';
import { Gauge } from '../components/Gauge.tsx';
import { announce } from '../components/LiveRegion.tsx';
import { ProgressTracker, STAGE_LABELS } from '../components/ProgressTracker.tsx';
import { getPlanet } from '../data/planets.ts';
import type { Attempt, MissionStage } from '../data/types.ts';
import { MISSION_STAGES } from '../data/types.ts';
import { DIFFICULTY } from '../config/difficulty.ts';
import { getComponent } from '../config/components.ts';
import { PRESSURE_BY_ATMOSPHERE } from '../config/physics.ts';
import { useReducedMotion } from '../hooks/useReducedMotion.ts';
import { CountdownScene, LaunchScene, SCENES } from '../launch/Scenes.tsx';
import { beep, rumble } from '../launch/sound.ts';
import { currentAttempt, useGame } from '../store/gameStore.ts';
import { useSettings } from '../store/settingsStore.ts';
import { ScreenMissing } from './ScreenMissing.tsx';

/** Seconds per stage (success path). Total with countdown ≈ 23 s. */
export const STAGE_DURATION: Record<MissionStage, number> = {
  launch: 3,
  orbit: 1.5,
  transit: 4,
  approach: 2,
  landing: 1.6,
  surface: 1.4,
  ascent: 1.6,
  return: 2.2,
  reentry: 1.8,
};
const COUNT_TICK = 0.45;
const FAIL_DURATION = 2.6;

type Phase =
  { kind: 'countdown'; count: number } | { kind: 'stage'; index: number } | { kind: 'done' };

function PressurePanel({ attempt, stage }: { attempt: Attempt; stage: MissionStage | null }) {
  const run = useGame((s) => s.run);
  const planet = getPlanet(attempt.planetId);
  const inPlay = run ? DIFFICULTY[run.difficulty].checksInPlay.includes('pressure') : false;
  const rating = getComponent(attempt.build.pressure);
  const ratingAtm = rating?.module === 'pressure' ? rating.ratingAtm : 0;
  const point = stage ? attempt.result.pressureTimeline.find((p) => p.stage === stage) : null;
  const outside = point?.atm ?? 1;
  const atPlanet = stage === 'landing' || stage === 'surface' || stage === 'ascent';
  const need = planet ? PRESSURE_BY_ATMOSPHERE[planet.atmosphere.value] : 1;
  let value = 0.35;
  let ok = true;
  if (inPlay && atPlanet) {
    const load = ratingAtm > 0 ? need / ratingAtm : 2;
    ok = load <= 1;
    value = ok ? 0.2 + 0.35 * load : Math.min(1, 0.8 + 0.1 * load);
  }
  const readout = !stage
    ? 'Standby'
    : inPlay
      ? `${outside} atm outside · rated ${ratingAtm || 0} atm`
      : 'Cabin 1 atm (nominal)';
  return (
    <Gauge
      label="Pressure systems"
      value={value}
      green={[0.15, 0.6]}
      redFrom={0.75}
      readout={readout}
      status={!stage ? 'idle' : ok ? 'ok' : 'bad'}
    />
  );
}

export function Launch() {
  const { run, go, markLaunchWatched, launchesWatched } = useGame();
  const attempt = run ? currentAttempt(run) : undefined;
  const planet = getPlanet(attempt?.planetId);
  const reduced = useReducedMotion();
  const sound = useSettings((s) => s.sound);
  const [phase, setPhase] = useState<Phase>({ kind: 'countdown', count: 10 });
  const watchedRef = useRef(false);
  const canSkip = launchesWatched > 0;

  const result = attempt?.result;
  const lastIndex = useMemo(() => {
    if (!result) return MISSION_STAGES.length - 1;
    return result.failedAt ? MISSION_STAGES.indexOf(result.failedAt) : MISSION_STAGES.length - 1;
  }, [result]);

  // Drive the timeline.
  useEffect(() => {
    if (!result) return;
    let t: number | undefined;
    if (phase.kind === 'countdown') {
      if (sound) beep(phase.count === 0 ? 1320 : 880);
      t = window.setTimeout(
        () =>
          setPhase(
            phase.count > 0
              ? { kind: 'countdown', count: phase.count - 1 }
              : { kind: 'stage', index: 0 },
          ),
        COUNT_TICK * 1000,
      );
    } else if (phase.kind === 'stage') {
      const stage = MISSION_STAGES[phase.index];
      const failing = result.failedAt === stage;
      const dur = failing ? FAIL_DURATION : STAGE_DURATION[stage];
      announce(`${STAGE_LABELS[stage]}${failing ? ': failure' : ''}.`);
      t = window.setTimeout(
        () =>
          setPhase(
            phase.index >= lastIndex ? { kind: 'done' } : { kind: 'stage', index: phase.index + 1 },
          ),
        dur * 1000,
      );
    }
    return () => window.clearTimeout(t);
  }, [phase, result, lastIndex, sound]);

  // Engine rumble during launch.
  useEffect(() => {
    if (!sound || phase.kind !== 'stage' || phase.index !== 0) return;
    const stop = rumble();
    return stop;
  }, [sound, phase]);

  useEffect(() => {
    if (phase.kind === 'done' && result && planet && !watchedRef.current) {
      watchedRef.current = true;
      markLaunchWatched();
      announce(
        result.success
          ? `Mission complete! The crew returned from ${planet.name}.`
          : `Mission failed during ${STAGE_LABELS[result.failedAt ?? 'launch']}.`,
      );
    }
  }, [phase, result, planet, markLaunchWatched]);

  if (!run || !attempt || !planet || !result) return <ScreenMissing what="a launched rocket" />;

  const stage: MissionStage | null =
    phase.kind === 'stage'
      ? MISSION_STAGES[phase.index]
      : phase.kind === 'done'
        ? MISSION_STAGES[lastIndex]
        : null;
  const failingNow = stage !== null && result.failedAt === stage;
  const failCheck = result.checks.find((c) => c.status === 'fail' && c.id !== 'total-dv');
  const fuelIdx = stage ? MISSION_STAGES.indexOf(stage) : -1;
  const fuel = fuelIdx < 0 ? 1 : (result.fuelTimeline[fuelIdx]?.fuelFrac ?? 0);
  const crew = attempt.build.crew;
  const sceneKey = phase.kind === 'countdown' ? 'countdown' : (stage ?? 'done');
  const sceneProps = {
    build: attempt.build,
    planet,
    failing: failingNow,
    reduced,
    duration: failingNow ? FAIL_DURATION : stage ? STAGE_DURATION[stage] : 1,
    failId: failingNow ? failCheck?.id : undefined,
  };
  const Scene = stage && stage !== 'launch' ? SCENES[stage] : null;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">
            Stage 7 · Mission {attempt.n} · {planet.name}
          </p>
          <h1 className="text-2xl font-bold">
            {phase.kind === 'countdown'
              ? 'Launch countdown'
              : phase.kind === 'done'
                ? result.success
                  ? 'Mission complete'
                  : 'Mission failed'
                : STAGE_LABELS[stage!]}
          </h1>
        </div>
        {phase.kind !== 'done' && canSkip && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPhase({ kind: 'done' })}
          >
            Skip animation ⏭
          </button>
        )}
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div
          className="panel relative aspect-[16/10] w-full overflow-hidden p-0 sm:aspect-video"
          aria-hidden="true"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={sceneKey}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.4 : 0.25 }}
            >
              {phase.kind === 'countdown' && (
                <CountdownScene build={attempt.build} count={phase.count} reduced={reduced} />
              )}
              {stage === 'launch' && <LaunchScene {...sceneProps} />}
              {Scene && <Scene {...sceneProps} />}
            </motion.div>
          </AnimatePresence>
          {phase.kind === 'done' && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-space-950/70 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className={`text-4xl font-black ${result.success ? 'text-ok' : 'text-bad'}`}>
                {result.success ? '✓ Mission complete!' : '✕ Mission failed'}
              </div>
              <div className="text-muted">
                {result.success
                  ? `Round trip to ${planet.name} and back`
                  : `Failed during ${STAGE_LABELS[result.failedAt!]}`}
              </div>
            </motion.div>
          )}
        </div>

        <aside className="flex flex-col gap-3" aria-label="Mission telemetry">
          <div className="panel p-3">
            <h2 className="eyebrow mb-2">Mission status</h2>
            <ProgressTracker
              current={stage}
              failedAt={result.failedAt}
              done={phase.kind === 'done'}
            />
          </div>
        </aside>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Instruments">
        <div className="panel p-3">
          <PressurePanel attempt={attempt} stage={stage} />
        </div>
        <div
          className="panel p-3"
          role="meter"
          aria-label="Fuel remaining"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fuel * 100)}
        >
          <div className="text-xs text-muted">Fuel</div>
          <div className="mt-2 flex h-24 w-full flex-col justify-end overflow-hidden rounded-lg bg-space-700">
            <motion.div
              className={`w-full ${fuel < 0.05 ? 'bg-bad' : fuel < 0.2 ? 'bg-warn' : 'bg-accent'}`}
              initial={false}
              animate={{ height: `${Math.max(0, fuel) * 100}%` }}
              transition={{ duration: reduced ? 0 : 1 }}
            />
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums">{Math.round(fuel * 100)}%</div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-muted">Crew on board</div>
          <div className="mt-2 flex min-h-8 flex-wrap gap-1">
            {crew === 0 ? (
              <span className="text-sm text-muted">Uncrewed probe</span>
            ) : (
              Array.from({ length: crew }, (_, i) => <AstronautIcon key={i} className="h-8 w-8" />)
            )}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {crew} astronaut{crew === 1 ? '' : 's'}
          </div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-muted">Astronaut multiplier</div>
          {crew > 0 ? (
            <>
              <div className="mt-1 text-2xl font-black text-ok tabular-nums">
                ×{(1 + SCORING.crew.successBonusPerAstronaut * crew).toFixed(1)}
              </div>
              <div className="text-xs text-muted">if successful</div>
              <div className="mt-1 text-lg font-bold text-bad tabular-nums">
                −{SCORING.crew.failurePenaltyPerAstronaut * crew}
              </div>
              <div className="text-xs text-muted">if the mission fails</div>
            </>
          ) : (
            <div className="mt-1 text-sm text-muted">×1.0. No crew, no risk, no bonus.</div>
          )}
        </div>
      </section>

      {phase.kind === 'done' && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary text-lg"
            onClick={() => go('outcome')}
            autoFocus
          >
            See results &amp; debrief →
          </button>
        </div>
      )}
    </div>
  );
}
