// Launch & journey scenes. The journey is the same pre-animated sequence for every player and
// planet; only the rocket (drawn from the player's parts) and the destination planet differ.
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { RocketSvg } from '../builder/parts/RocketSvg.tsx';
import { PlanetVisual, tempColor } from '../components/PlanetVisual.tsx';
import type { CheckId, MissionStage, Planet, RocketBuild } from '../data/types.ts';

export interface SceneProps {
  build: RocketBuild;
  planet: Planet;
  failing: boolean;
  reduced: boolean;
  duration: number;
  /** The check that failed at this stage (for the caption). */
  failId?: CheckId;
}

// Deterministic starfield (seeded) so the journey is identical for everyone.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rnd = seeded(42);
const STARS = Array.from({ length: 90 }, () => ({
  x: rnd() * 100,
  y: rnd() * 100,
  r: rnd() * 1.6 + 0.4,
  o: rnd() * 0.6 + 0.3,
}));

function Stars({
  drift = 0,
  duration = 4,
  reduced,
}: {
  drift?: number;
  duration?: number;
  reduced: boolean;
}) {
  const layer = (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.18} fill="#fff" opacity={s.o} />
      ))}
    </svg>
  );
  if (!drift || reduced) return <div className="absolute inset-0">{layer}</div>;
  return (
    <motion.div
      className="absolute inset-0 flex"
      style={{ width: '200%' }}
      initial={{ x: drift > 0 ? '0%' : '-50%' }}
      animate={{ x: drift > 0 ? '-50%' : '0%' }}
      transition={{ duration, ease: 'linear' }}
    >
      <div className="relative h-full w-1/2">{layer}</div>
      <div className="relative h-full w-1/2">{layer}</div>
    </motion.div>
  );
}

function Rocket({
  build,
  flame = true,
  size = 130,
  rotate = 0,
}: {
  build: RocketBuild;
  flame?: boolean;
  size?: number;
  rotate?: number;
}) {
  return (
    <div style={{ transform: `rotate(${rotate}deg)` }}>
      <RocketSvg build={build} height={size} flame={flame} flameScale={0.8} title="Your rocket" />
    </div>
  );
}

function Caption({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'bad' | 'ok';
}) {
  const cls =
    tone === 'bad'
      ? 'border-bad/60 bg-bad/20 text-bad'
      : tone === 'ok'
        ? 'border-ok/60 bg-ok/15 text-ok'
        : 'border-space-600 bg-space-900/80 text-ink';
  return (
    <div
      className={`absolute left-1/2 top-3 -translate-x-1/2 rounded-full border px-3 py-1 text-sm font-semibold ${cls}`}
    >
      {children}
    </div>
  );
}

const ease = [0.45, 0, 0.55, 1] as const;

export function CountdownScene({
  build,
  count,
  reduced,
}: {
  build: RocketBuild;
  count: number;
  reduced: boolean;
}) {
  const igniting = count <= 3;
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#0b2a5a] via-[#123a72] to-[#2c5a8a]">
      <div className="absolute inset-x-0 bottom-0 h-[14%] bg-[#1d2a20]" />
      <div
        className="absolute bottom-[14%] left-[calc(50%+46px)] h-[46%] w-3 border-x-2 border-[#8b93a7] [background:repeating-linear-gradient(45deg,transparent_0_6px,#8b93a7_6px_8px)]"
        aria-hidden="true"
      />
      <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2">
        <Rocket build={build} flame={igniting} size={150} />
      </div>
      {igniting && !reduced && (
        <div
          className="absolute bottom-[10%] left-1/2 flex -translate-x-1/2 gap-6"
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-10 w-10 rounded-full bg-white/50 blur-sm"
              initial={{ scale: 0.4, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[min(22vw,9rem)] font-black text-white/90 tabular-nums [text-shadow:0_0_30px_rgba(255,122,26,0.7)]"
          aria-hidden="true"
        >
          {count}
        </span>
      </div>
      <Caption>{igniting ? 'Ignition sequence start' : 'T-minus'}</Caption>
    </div>
  );
}

export function LaunchScene({ build, failing, reduced, duration }: SceneProps) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ background: 'linear-gradient(#123a72, #2c5a8a)' }}
      animate={{
        background: failing
          ? 'linear-gradient(#123a72, #2c5a8a)'
          : 'linear-gradient(#04060f, #0b1a3a)',
      }}
      transition={{ duration: reduced ? 0 : duration }}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 bg-[#1d2a20]"
        initial={{ height: '14%' }}
        animate={{ height: failing ? '14%' : '0%' }}
        transition={{ duration: reduced ? 0 : duration * 0.8, ease }}
      />
      <motion.div
        className="absolute bottom-[14%] left-1/2 -translate-x-1/2"
        initial={reduced ? false : { y: 0, rotate: 0 }}
        animate={
          failing
            ? { y: [0, -50, -60, 40], x: [0, -4, 4, -6, 6, 0], rotate: [0, 0, 6, 28] }
            : { y: '-140%' }
        }
        transition={{ duration: reduced ? 0 : duration, ease: failing ? 'easeInOut' : 'easeIn' }}
      >
        <Rocket build={build} size={150} flame={!failing || !reduced} />
      </motion.div>
      {failing && (
        <motion.div
          className="absolute bottom-[12%] left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ffe08a,#ff7a1a_45%,transparent_70%)]"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 0, 1, 0.6], scale: [0.3, 0.3, 1.6, 2] }}
          transition={{ duration: reduced ? 0.01 : duration, times: [0, 0.75, 0.85, 1] }}
          aria-hidden="true"
        />
      )}
      <Caption tone={failing ? 'bad' : 'info'}>
        {failing ? 'Engines sputter… the rocket falls back' : 'Lift-off!'}
      </Caption>
    </motion.div>
  );
}

export function OrbitScene({ build, reduced, duration }: SceneProps) {
  return (
    <div className="absolute inset-0 bg-space-950">
      <Stars reduced={reduced} />
      <div
        className="absolute -bottom-[70%] left-1/2 h-[110%] w-[160%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle_at_50%_20%,#5fb3ff,#1d5aa8_45%,#0b2a5a_70%)] shadow-[0_0_60px_#5fb3ff88]"
        aria-hidden="true"
      />
      <motion.div
        className="absolute top-[30%]"
        initial={reduced ? false : { left: '10%' }}
        animate={{ left: '70%' }}
        transition={{ duration: reduced ? 0 : duration, ease: 'linear' }}
      >
        <Rocket build={build} size={90} rotate={90} flame={false} />
      </motion.div>
      <Caption>Earth orbit reached</Caption>
    </div>
  );
}

export function TransitScene({
  build,
  failing,
  reduced,
  duration,
  back = false,
  failId,
}: SceneProps & { back?: boolean }) {
  const dir = back ? -1 : 1;
  return (
    <div className="absolute inset-0 bg-space-950">
      <Stars drift={dir} duration={duration * 1.6} reduced={reduced} />
      {/* Moon, Sun and a distant star pass by: identical for every mission. */}
      <motion.div
        className="absolute top-[12%] h-16 w-16 rounded-full bg-[radial-gradient(circle_at_35%_35%,#f2f2f2,#9a9a9a_60%,#5a5a5a)]"
        initial={reduced ? false : { left: back ? '-15%' : '105%' }}
        animate={{ left: back ? '105%' : '-15%' }}
        transition={{ duration: reduced ? 0 : duration * 0.9, ease: 'linear' }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute bottom-[8%] h-24 w-24 rounded-full bg-[radial-gradient(circle,#fff6c8,#ffcb47_45%,#ff9a1a55_70%,transparent_72%)]"
        initial={reduced ? false : { left: back ? '-30%' : '130%' }}
        animate={{ left: back ? '120%' : '-30%' }}
        transition={{
          duration: reduced ? 0 : duration * 1.2,
          ease: 'linear',
          delay: reduced ? 0 : duration * 0.2,
        }}
        aria-hidden="true"
      />
      {back && (
        <motion.div
          className="absolute left-[6%] top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#bfe3ff,#3a8de0_50%,#0b2a5a)]"
          initial={reduced ? false : { scale: 0.1 }}
          animate={{ scale: failing ? 0.3 : 1 }}
          transition={{ duration: reduced ? 0 : duration }}
          aria-hidden="true"
        />
      )}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={reduced ? false : { x: 0, y: 0, rotate: 0, opacity: 1 }}
        animate={
          failing ? { x: 220 * dir, y: 140, rotate: 200, opacity: 0 } : { y: [0, -6, 0, 6, 0] }
        }
        transition={{ duration: reduced ? 0 : duration, ease: failing ? 'easeIn' : 'easeInOut' }}
      >
        <Rocket build={build} size={100} rotate={back ? -90 : 90} flame={!failing} />
      </motion.div>
      <Caption tone={failing ? 'bad' : 'info'}>
        {failing
          ? back
            ? failId === 'life-support'
              ? 'Life support exhausted: lost on the return journey'
              : 'Out of fuel: lost on the return journey'
            : failId === 'comms'
              ? 'Signal lost: drifting off course…'
              : 'Out of fuel: drifting off course…'
          : back
            ? 'Return journey'
            : 'The long voyage'}
      </Caption>
    </div>
  );
}

export function ApproachScene({ build, planet, failing, reduced, duration }: SceneProps) {
  const cold = planet.eqTempK.value < 200;
  return (
    <div className="absolute inset-0 bg-space-950">
      <Stars reduced={reduced} />
      <motion.div
        className="absolute right-[6%] top-1/2 -translate-y-1/2"
        initial={reduced ? false : { scale: 0.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: reduced ? 0 : duration, ease: 'easeOut' }}
      >
        <PlanetVisual planet={planet} size={220} decorative />
      </motion.div>
      <motion.div
        className="absolute left-[12%] top-1/2 -translate-y-1/2"
        initial={reduced ? false : { x: 0, opacity: 1 }}
        animate={
          failing
            ? {
                x: 160,
                opacity: [1, 1, 0],
                filter: cold
                  ? 'hue-rotate(180deg) brightness(1.6)'
                  : 'sepia(1) saturate(6) hue-rotate(-30deg)',
              }
            : { x: 120 }
        }
        transition={{ duration: reduced ? 0 : duration }}
      >
        <Rocket build={build} size={90} rotate={90} flame={!failing} />
      </motion.div>
      {failing && (
        <motion.div
          className={`absolute inset-0 ${cold ? 'bg-[#9fd3f5]/25' : 'bg-[#ff5a2a]/25'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.4] }}
          transition={{ duration: reduced ? 0.01 : duration }}
          aria-hidden="true"
        />
      )}
      <Caption tone={failing ? 'bad' : 'info'}>
        {failing
          ? cold
            ? 'Systems frozen on approach'
            : 'Overheating: burn-up on approach'
          : `Approaching ${planet.name}`}
      </Caption>
    </div>
  );
}

function Surface({ planet, children }: { planet: Planet; children: ReactNode }) {
  const c = tempColor(planet.eqTempK.value);
  return (
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(${c.dark}, #04060f 70%)` }}
    >
      <div
        className="absolute -bottom-[40%] left-1/2 h-[70%] w-[180%] -translate-x-1/2 rounded-[50%]"
        style={{
          background: `radial-gradient(circle at 50% 10%, ${c.light}, ${c.base} 30%, ${c.dark} 70%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

export function LandingScene({ build, planet, failing, reduced, duration, failId }: SceneProps) {
  return (
    <Surface planet={planet}>
      <motion.div
        className="absolute bottom-[29%] left-1/2 -translate-x-1/2"
        initial={reduced ? false : { y: -260 }}
        animate={failing ? { y: [-260, 20], rotate: [0, 35] } : { y: 0 }}
        transition={{ duration: reduced ? 0 : duration, ease: failing ? 'easeIn' : 'easeOut' }}
      >
        <Rocket build={build} size={120} flame={!failing} />
      </motion.div>
      <Caption tone={failing ? 'bad' : 'info'}>
        {failing
          ? failId === 'landing-gear'
            ? 'No lander legs: crash landing'
            : 'Crash landing: not enough fuel to slow down'
          : `Landing on ${planet.name}`}
      </Caption>
    </Surface>
  );
}

export function SurfaceScene({ build, planet, failing, reduced, duration }: SceneProps) {
  return (
    <Surface planet={planet}>
      <motion.div
        className="absolute bottom-[29%] left-1/2 -translate-x-1/2"
        animate={
          failing && !reduced
            ? { x: [0, -5, 5, -4, 4, 0], filter: ['none', 'none', 'brightness(0.6)'] }
            : {}
        }
        transition={{ duration: reduced ? 0 : duration }}
      >
        <Rocket build={build} size={120} flame={false} />
      </motion.div>
      {failing && (
        <motion.div
          className="absolute inset-0 bg-bad/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.3, 1] }}
          transition={{ duration: reduced ? 0.01 : duration }}
          aria-hidden="true"
        />
      )}
      <Caption tone={failing ? 'bad' : 'ok'}>
        {failing
          ? 'Hull breach! Pressure systems failed: stranded'
          : 'Surface operations: samples collected'}
      </Caption>
    </Surface>
  );
}

export function AscentScene({ build, planet, failing, reduced, duration, failId }: SceneProps) {
  return (
    <Surface planet={planet}>
      <motion.div
        className="absolute bottom-[29%] left-1/2 -translate-x-1/2"
        initial={reduced ? false : { y: 0 }}
        animate={failing ? { y: [0, -40, -20, 0] } : { y: -420 }}
        transition={{ duration: reduced ? 0 : duration, ease: 'easeIn' }}
      >
        <Rocket build={build} size={120} flame />
      </motion.div>
      <Caption tone={failing ? 'bad' : 'info'}>
        {failing
          ? failId === 'fuel-ascent'
            ? 'Out of fuel: stranded on the surface'
            : 'Not enough thrust to escape: stranded on the surface'
          : 'Ascent: leaving the planet'}
      </Caption>
    </Surface>
  );
}

export function ReentryScene({ build, failing, reduced, duration }: SceneProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-space-950 to-[#0b2a5a]">
      <Stars reduced={reduced} />
      <div
        className="absolute -bottom-[60%] left-1/2 h-[100%] w-[170%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle_at_50%_15%,#7cc8ff,#1d5aa8_45%,#0b2a5a_70%)]"
        aria-hidden="true"
      />
      <motion.div
        className="absolute left-1/2 top-[10%] -translate-x-1/2"
        initial={reduced ? false : { y: -80, opacity: 1 }}
        animate={
          failing
            ? { y: 120, opacity: [1, 1, 0], filter: 'sepia(1) saturate(6) hue-rotate(-30deg)' }
            : { y: 90 }
        }
        transition={{ duration: reduced ? 0 : duration }}
      >
        <div className="relative">
          <Rocket build={build} size={100} rotate={180} flame={false} />
          <div
            className="absolute inset-x-0 -bottom-2 mx-auto h-10 w-16 rounded-full bg-[#ff9a3c]/70 blur-md"
            aria-hidden="true"
          />
        </div>
      </motion.div>
      <Caption tone={failing ? 'bad' : 'ok'}>
        {failing ? 'No fuel for the braking burn: burned up on re-entry' : 'Re-entry… splashdown!'}
      </Caption>
    </div>
  );
}

export const SCENES: Record<Exclude<MissionStage, 'launch'>, (p: SceneProps) => ReactNode> = {
  orbit: OrbitScene,
  transit: TransitScene,
  approach: ApproachScene,
  landing: LandingScene,
  surface: SurfaceScene,
  ascent: AscentScene,
  return: (p) => <TransitScene {...p} back />,
  reentry: ReentryScene,
};
