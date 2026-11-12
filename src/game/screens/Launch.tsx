import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { announce } from '../../components/LiveRegion.tsx';
import { PlanetVisual } from '../../components/PlanetVisual.tsx';
import { getPlanet } from '../../data/planets.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { useGame, currentAttempt } from '../../store/gameStore.ts';
import { useSettings } from '../../store/settingsStore.ts';
import { SCORING, getPart, type HullPart } from '../config.ts';
import { STAGES, STAGE_LABELS, outsidePressure, type Stage as MStage } from '../engine.ts';
import { beep, rumble } from '../sound.ts';
import { RocketArt } from '../ui/RocketArt.tsx';
import { Stage, Starfield } from '../ui/Scenery.tsx';

const DUR: Record<MStage, number> = {
  launch: 3.4,
  journey: 4,
  approach: 2.2,
  landing: 1.8,
  ascent: 1.8,
  return: 2.6,
};
const FAIL_DUR = 2.8;
const COUNT = 5;

// ---------- City (original artwork, generated) ----------
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}
function skyline(seed: number, count: number, minH: number, maxH: number) {
  const r = seeded(seed);
  let x = -2;
  return Array.from({ length: count }, () => {
    const w = 2 + r() * 5;
    const b = {
      x,
      w,
      h: minH + r() * (maxH - minH),
      spire: r() > 0.75,
      lit: Array.from({ length: 6 }, () => [r(), r()] as const),
    };
    x += w + r() * 0.8;
    return b;
  });
}
const FAR = skyline(3, 40, 8, 22);
const MID = skyline(11, 34, 12, 34);
const NEAR = skyline(29, 26, 6, 18);

function CityLayer({
  blocks,
  color,
  windows,
  y,
}: {
  blocks: typeof FAR;
  color: string;
  windows: string;
  y: number;
}) {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-full w-full"
      viewBox="0 0 160 90"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ transform: `translateY(${y}%)` }}
    >
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={90 - b.h} width={b.w} height={b.h} fill={color} />
          {b.spire && (
            <rect x={b.x + b.w / 2 - 0.15} y={90 - b.h - 5} width="0.3" height="5" fill={color} />
          )}
          {b.lit.map(([a, c], j) => (
            <rect
              key={j}
              x={b.x + 0.4 + a * (b.w - 1)}
              y={90 - b.h + 1 + c * (b.h - 3)}
              width="0.5"
              height="0.35"
              fill={windows}
              opacity={0.5 + a * 0.5}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function City({ rise, reduced }: { rise: boolean; reduced: boolean }) {
  // When the rocket rises, the camera follows it: layers slide down at different speeds.
  const t = (dist: number) => (rise ? { y: `${dist}%` } : { y: '0%' });
  const tr = { duration: reduced ? 0 : DUR.launch, ease: [0.5, 0, 0.75, 1] as const };
  return (
    <>
      {/* hazy dusk sky */}
      <motion.div
        className="absolute inset-0"
        initial={{
          background: 'linear-gradient(#3e4a55 0%, #8a8a70 55%, #c9b98a 70%, #6b6f62 100%)',
        }}
        animate={{
          background: rise
            ? 'linear-gradient(#02040c 0%, #0a1a3a 60%, #2a3a5a 100%)'
            : 'linear-gradient(#3e4a55 0%, #8a8a70 55%, #c9b98a 70%, #6b6f62 100%)',
        }}
        transition={tr}
      />
      {rise && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : DUR.launch * 0.5, duration: 1 }}
        >
          <Starfield />
        </motion.div>
      )}
      {/* low sun glow */}
      <motion.div
        className="absolute left-[60%] top-[34%] h-[16%] w-[14%] rounded-full bg-[radial-gradient(circle,#fff6d8,#ffe3a0_35%,rgba(255,220,150,0)_70%)]"
        animate={t(80)}
        transition={tr}
      />
      <motion.div className="absolute inset-0" animate={t(30)} transition={tr}>
        <CityLayer blocks={FAR} color="#5d6460" windows="#e8f0a0" y={-8} />
      </motion.div>
      {/* fog band */}
      <motion.div
        className="absolute inset-x-0 top-[50%] h-[30%] bg-[linear-gradient(transparent,rgba(200,200,170,0.45),transparent)]"
        animate={t(50)}
        transition={tr}
      />
      <motion.div className="absolute inset-0" animate={t(60)} transition={tr}>
        <CityLayer blocks={MID} color="#3a403f" windows="#f5ff9a" y={0} />
        {/* light beams */}
        {[22, 47, 88, 131].map((x, i) => (
          <motion.div
            key={x}
            className="absolute bottom-[10%] w-[0.35%] bg-[linear-gradient(transparent,#7dffb0)]"
            style={{ left: `${(x / 160) * 100}%`, height: `${18 + i * 6}%` }}
            animate={reduced ? undefined : { opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2 + i * 0.4, repeat: Infinity }}
          />
        ))}
      </motion.div>
      <motion.div className="absolute inset-0" animate={t(110)} transition={tr}>
        <CityLayer blocks={NEAR} color="#1f2422" windows="#ffd37a" y={4} />
        <div className="absolute inset-x-0 bottom-0 h-[25%] bg-[linear-gradient(transparent,rgba(30,35,30,0.7))]" />
      </motion.div>
      {/* flying traffic */}
      {!reduced &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute h-[0.5%] w-[1.2%] rounded-full bg-[#ffdca0] shadow-[0_0_6px_#ffdca0]"
            style={{ top: `${40 + i * 7}%` }}
            initial={{ left: '-5%' }}
            animate={{ left: '105%' }}
            transition={{ duration: 7 + i * 2, repeat: Infinity, delay: i * 1.5, ease: 'linear' }}
            aria-hidden="true"
          />
        ))}
    </>
  );
}

function Smoke({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div
      className="pointer-events-none absolute bottom-[8%] left-1/2 -translate-x-1/2"
      aria-hidden="true"
    >
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-full bg-[#e8e4da]/70 blur-[3px]"
          style={{ width: 40, height: 40, left: -20 }}
          initial={{ x: 0, y: 0, scale: 0.3, opacity: 0.9 }}
          animate={{
            x: (i % 2 ? 1 : -1) * (40 + i * 18),
            y: -10 - (i % 3) * 8,
            scale: 2 + i * 0.25,
            opacity: 0,
          }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.12, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function Explosion() {
  return (
    <div
      className="pointer-events-none absolute inset-0 grid place-items-center"
      aria-hidden="true"
    >
      <motion.div
        className="h-[30%] w-[20%] rounded-full bg-[radial-gradient(circle,#fff6c8,#ff9a1a_40%,#ff3a1a_60%,transparent_72%)]"
        initial={{ scale: 0.1, opacity: 0 }}
        animate={{ scale: [0.1, 1.8, 2.4], opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, delay: 1 }}
      />
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-[#ffd37a]"
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: Math.cos(i) * 180, y: Math.sin(i * 1.7) * 140, opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, delay: 1.05 }}
        />
      ))}
    </div>
  );
}

function PressureMeter({ value, ok, label }: { value: number; ok: boolean; label: string }) {
  const angle = -90 + Math.min(1, Math.max(0, value)) * 180;
  return (
    <figure
      role="meter"
      aria-label="Pressure meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-valuetext={`${label}, ${ok ? 'safe' : 'danger'}`}
      className="flex flex-col items-center"
    >
      <svg viewBox="0 0 120 70" className="w-full">
        <path d="M14 60 A46 46 0 0 1 106 60" stroke="#24345f" strokeWidth="10" fill="none" />
        <path d="M21 34 A46 46 0 0 1 82 17" stroke="#3ddc84" strokeWidth="10" fill="none" />
        <path d="M92 26 A46 46 0 0 1 106 60" stroke="#ff6b6b" strokeWidth="10" fill="none" />
        <motion.line
          x1="60"
          y1="60"
          x2="60"
          y2="20"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ originX: '60px', originY: '60px' }}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 60, damping: 8 }}
        />
        <circle cx="60" cy="60" r="5" fill="#fff" />
      </svg>
      <figcaption
        className={`text-center text-[clamp(8px,0.85vw,12px)] font-bold ${ok ? 'text-ok' : 'text-bad'}`}
      >
        {ok ? '✓' : '✕'} {label}
      </figcaption>
    </figure>
  );
}

export function Launch() {
  const { run, go, markWatched, launchesWatched } = useGame();
  const attempt = currentAttempt(run);
  const planet = getPlanet(attempt?.planetId);
  const reduced = useReducedMotion();
  const sound = useSettings((s) => s.sound);
  const [count, setCount] = useState(COUNT);
  const [idx, setIdx] = useState(-1); // -1 = countdown
  const [done, setDone] = useState(false);
  const told = useRef(false);
  const result = attempt?.result;
  const lastIdx = useMemo(
    () => (result?.failedAt ? STAGES.indexOf(result.failedAt) : STAGES.length - 1),
    [result],
  );

  useEffect(() => {
    if (!result || done) return;
    let t: number;
    if (idx === -1) {
      if (sound) beep(count === 0 ? 1320 : 880);
      t = window.setTimeout(() => (count > 0 ? setCount(count - 1) : setIdx(0)), 650);
    } else {
      const stage = STAGES[idx];
      const failing = result.failedAt === stage;
      announce(`${STAGE_LABELS[stage]}${failing ? ': failure!' : ''}`);
      t = window.setTimeout(
        () => (idx >= lastIdx ? setDone(true) : setIdx(idx + 1)),
        (failing ? FAIL_DUR : DUR[stage]) * 1000,
      );
    }
    return () => window.clearTimeout(t);
  }, [idx, count, result, lastIdx, done, sound]);

  useEffect(() => {
    if (!sound || idx !== 0) return;
    return rumble();
  }, [sound, idx]);

  useEffect(() => {
    if (done && result && planet && !told.current) {
      told.current = true;
      markWatched();
      announce(
        result.success
          ? `Mission complete! Back from ${planet.name}.`
          : `Mission failed during ${STAGE_LABELS[result.failedAt!]}.`,
      );
    }
  }, [done, result, planet, markWatched]);

  if (!attempt || !planet || !result) {
    return (
      <div className="p-6 text-center">
        <button type="button" className="big-btn" onClick={() => go('mission')}>
          Back to mission control
        </button>
      </div>
    );
  }

  const stage: MStage | null = done ? STAGES[lastIdx] : idx >= 0 ? STAGES[idx] : null;
  const failing = !!stage && result.failedAt === stage;
  const failCheck = result.checks.find((c) => !c.ok);
  const hull = getPart(attempt.build.hull) as HullPart | undefined;
  const fuelFrac = (() => {
    if (!stage) return attempt.dials.fuel / 100;
    const i = STAGES.indexOf(stage);
    const use = result.success ? 0.85 : 1;
    return Math.max(0, (attempt.dials.fuel / 100) * (1 - (use * (i + 1)) / STAGES.length));
  })();
  const atPlanet = stage === 'landing' || stage === 'ascent';
  const pressureOk = !(
    failing &&
    (failCheck?.id === 'pressure-low' || failCheck?.id === 'pressure-high')
  );
  const pressureValue =
    atPlanet || stage === 'approach'
      ? pressureOk
        ? 0.25 + 0.25 * Math.min(1, outsidePressure(planet) / (hull?.strengthAtm ?? 1))
        : 0.95
      : 0.3;
  const crew = attempt.build.crew;

  const scene = (() => {
    if (idx === -1 || stage === 'launch') {
      const rise = stage === 'launch' && !(failing && failCheck?.id === 'twr-earth');
      const sputter = stage === 'launch' && failing;
      return (
        <>
          <City rise={rise} reduced={reduced} />
          {/* launch platform */}
          {!rise && (
            <div className="absolute bottom-[6%] left-1/2 h-[3%] w-[16%] -translate-x-1/2 rounded bg-[#2a2f2e] shadow-[0_0_20px_#000]" />
          )}
          <motion.div
            className="absolute bottom-[8%] left-1/2 h-[46%] -translate-x-1/2"
            initial={false}
            animate={
              sputter
                ? { y: ['0%', '-25%', '-15%', '10%'], rotate: [0, 0, 8, 30], x: [0, -6, 6, -10] }
                : rise
                  ? { y: '-170%' }
                  : idx === -1 && count <= 2 && !reduced
                    ? { x: [0, -2, 2, 0] }
                    : {}
            }
            transition={
              sputter
                ? { duration: reduced ? 0 : FAIL_DUR * 0.8 }
                : rise
                  ? { duration: reduced ? 0 : DUR.launch, ease: 'easeIn' }
                  : { duration: 0.15, repeat: Infinity }
            }
          >
            <RocketArt
              build={attempt.build}
              height={1000}
              flame={idx === -1 ? (count <= 2 ? 0.4 : 0) : sputter ? 0.3 : 1}
              className="h-full w-auto"
            />
          </motion.div>
          <Smoke on={(idx === -1 && count <= 2) || (stage === 'launch' && !reduced)} />
          {sputter && <Explosion />}
          {idx === -1 && (
            <div className="absolute inset-x-0 top-[10%] grid place-items-center">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={count}
                  initial={{ scale: 2.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  className="title-font text-[clamp(48px,10vw,150px)] text-white [text-shadow:0_6px_0_#0b0f1e,0_0_40px_rgba(255,179,90,0.8)]"
                  aria-hidden="true"
                >
                  {count === 0 ? 'GO!' : count}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </>
      );
    }
    const space = (children: React.ReactNode, streak = false, dir = 1) => (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,#0d1a3a,#02040c)]">
        <Starfield />
        {streak && !reduced && (
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 40 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute h-[2px] rounded-full bg-white/70"
                style={{ top: `${(i * 37) % 100}%`, width: `${4 + (i % 5) * 3}%` }}
                initial={{ left: dir > 0 ? '110%' : '-20%' }}
                animate={{ left: dir > 0 ? '-20%' : '110%' }}
                transition={{
                  duration: 0.6 + (i % 4) * 0.25,
                  repeat: Infinity,
                  delay: (i % 7) * 0.12,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
        )}
        {children}
      </div>
    );
    const ship = (rot: number, extra: object = {}, flame = 1) => (
      <motion.div
        className="absolute left-1/2 top-1/2 h-[42%] -translate-x-1/2 -translate-y-1/2"
        style={{ rotate: rot }}
        {...extra}
      >
        <RocketArt build={attempt.build} height={1000} flame={flame} className="h-full w-auto" />
      </motion.div>
    );
    switch (stage) {
      case 'journey':
        return space(
          <>
            {/* Shared journey: Moon, Sun flare, distant galaxy, identical for every mission */}
            <motion.div
              className="absolute top-[10%] h-[18%] w-[10%] rounded-full bg-[radial-gradient(circle_at_35%_35%,#f2f2f2,#9a9a9a_60%,#4a4a4a)]"
              initial={{ left: '100%' }}
              animate={{ left: '-15%' }}
              transition={{ duration: reduced ? 0 : DUR.journey, ease: 'linear' }}
            />
            <motion.div
              className="absolute bottom-[5%] h-[34%] w-[20%] rounded-full bg-[radial-gradient(circle,#fff6c8,#ffcb47_35%,rgba(255,154,26,0.3)_60%,transparent_72%)]"
              initial={{ left: '120%' }}
              animate={{ left: '-30%' }}
              transition={{ duration: reduced ? 0 : DUR.journey * 1.2, ease: 'linear' }}
            />
            <div className="absolute right-[12%] top-[60%] h-[10%] w-[14%] rotate-[-20deg] rounded-[50%] bg-[radial-gradient(ellipse,#e8d8ff,rgba(150,120,255,0.3)_45%,transparent_70%)]" />
            {ship(
              90,
              failing
                ? {
                    animate: { x: 260, y: 160, rotate: 300, opacity: 0 },
                    transition: { duration: reduced ? 0 : FAIL_DUR, ease: 'easeIn' },
                  }
                : {
                    animate: { y: [0, -8, 0, 8, 0] },
                    transition: { duration: 2, repeat: Infinity },
                  },
              failing ? 0 : 1,
            )}
          </>,
          true,
        );
      case 'approach': {
        const hot = planet.eqTempK.value > (hull?.maxK ?? 9999);
        return space(
          <>
            <motion.div
              className="absolute right-[4%] top-1/2 -translate-y-1/2"
              initial={{ scale: 0.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: reduced ? 0 : DUR.approach, ease: 'easeOut' }}
            >
              <PlanetVisual
                planet={planet}
                size={360}
                decorative
                className="h-auto w-[min(32vw,360px)]"
              />
            </motion.div>
            {ship(
              90,
              failing
                ? {
                    animate: {
                      x: 140,
                      opacity: [1, 1, 0],
                      filter: hot
                        ? 'sepia(1) saturate(8) hue-rotate(-30deg) brightness(1.4)'
                        : 'none',
                    },
                    transition: { duration: reduced ? 0 : FAIL_DUR },
                  }
                : {
                    animate: { x: [-200, 60] },
                    transition: { duration: reduced ? 0 : DUR.approach },
                  },
              failing ? 0.2 : 0.8,
            )}
            {failing && (
              <motion.div
                className="absolute inset-0 bg-[#ff5a2a]/30"
                animate={{ opacity: [0, 1, 0.3, 0.8] }}
                transition={{ duration: 1.5 }}
              />
            )}
          </>,
        );
      }
      case 'landing':
      case 'ascent': {
        const up = stage === 'ascent';
        return (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(#0a0f22, #1c2a44)' }}
          >
            <Starfield />
            <div className="absolute left-1/2 top-[44%] w-[230%] -translate-x-1/2">
              <PlanetVisual planet={planet} size={1600} decorative className="h-auto w-full" />
            </div>
            <motion.div
              className="absolute bottom-[30%] left-1/2 h-[38%] -translate-x-1/2"
              initial={{ y: up ? '0%' : '-150%' }}
              animate={
                failing
                  ? up
                    ? { y: ['0%', '-20%', '-8%', '0%'] }
                    : { y: ['-150%', '10%'], rotate: [0, 30] }
                  : up
                    ? { y: '-260%' }
                    : { y: '0%' }
              }
              transition={{
                duration: reduced ? 0 : failing ? FAIL_DUR : DUR[stage],
                ease: up ? 'easeIn' : 'easeOut',
              }}
            >
              <RocketArt
                build={attempt.build}
                height={1000}
                flame={failing && !up ? 0 : 1}
                className="h-full w-auto"
              />
            </motion.div>
            {failing && failCheck?.id?.startsWith('pressure') && (
              <motion.div
                className="absolute inset-0 bg-bad/30"
                animate={{ opacity: [0, 1, 0.2, 1] }}
                transition={{ duration: 1.6 }}
              />
            )}
            {failing && !up && failCheck?.id === 'fuel' && <Explosion />}
          </div>
        );
      }
      case 'return':
        return space(
          <>
            <motion.div
              className="absolute left-[6%] top-1/2 h-[40%] w-[22%] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#cfeeff,#3a8de0_45%,#123a7a_70%)] shadow-[0_0_40px_#3a8de0]"
              initial={{ scale: 0.15 }}
              animate={{ scale: failing ? 0.3 : 1 }}
              transition={{ duration: reduced ? 0 : DUR.return }}
            />
            {ship(
              -90,
              failing
                ? {
                    animate: { x: 200, y: -160, rotate: -200, opacity: 0 },
                    transition: { duration: reduced ? 0 : FAIL_DUR },
                  }
                : {
                    animate: { x: [180, -40] },
                    transition: { duration: reduced ? 0 : DUR.return },
                  },
            )}
            {done && result.success && (
              <motion.div
                className="absolute left-[12%] top-[38%] text-[40px]"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                aria-hidden="true"
              >
                🪂
              </motion.div>
            )}
          </>,
          true,
          -1,
        );
      default:
        return null;
    }
  })();

  const caption = failing
    ? {
        'twr-earth': 'Too heavy! The engines sputter and the rocket falls back.',
        comms: 'Signal lost… the rocket drifts off course.',
        fuel:
          stage === 'landing'
            ? 'Out of fuel: crash landing!'
            : 'Out of fuel: drifting in deep space.',
        heat:
          planet.eqTempK.value > (hull?.maxK ?? 0)
            ? 'Hull overheating: burn-up on approach!'
            : 'Hull failure on approach!',
        'pressure-low': 'Hull crushed by the outside pressure!',
        'pressure-high': 'The pressure seal burst the hull!',
        'twr-planet': 'Not enough thrust: stranded on the surface.',
      }[failCheck?.id ?? 'fuel']
    : stage
      ? {
          launch: `Lift-off from Earth City!`,
          journey: 'The long voyage…',
          approach: `Approaching ${planet.name}`,
          landing: `Touchdown on ${planet.name}`,
          ascent: 'Taking off again…',
          return: done ? 'Splashdown! Welcome home.' : 'Heading home to Earth',
        }[stage]
      : 'Countdown';

  return (
    <Stage>
      <div
        className={`absolute inset-0 ${failing && !reduced ? 'animate-[shake_0.3s_ease-in-out_3]' : ''}`}
        aria-hidden="true"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={idx === -1 ? 'launch' : stage === 'launch' ? 'launch' : stage!}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {scene}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Caption */}
      <motion.div
        key={caption}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`outlined absolute left-1/2 top-[3%] -translate-x-1/2 whitespace-nowrap text-[clamp(12px,1.8vw,24px)] font-black ${failing ? 'text-[#ff8a8a]' : ''}`}
        role="status"
      >
        {caption}
      </motion.div>

      {/* Mission tracker */}
      <ol
        aria-label="Mission status"
        className="absolute left-[1.5%] top-[12%] flex flex-col gap-[0.4vw]"
      >
        {STAGES.map((s, i) => {
          const cur = stage === s;
          const cleared = stage ? i < STAGES.indexOf(stage) || (done && result.success) : false;
          const bad = result.failedAt === s && (cur || done);
          return (
            <li
              key={s}
              className={`rounded-md border px-[0.6vw] py-[0.2vw] text-[clamp(8px,0.85vw,12px)] font-bold ${bad ? 'border-bad bg-bad/30 text-white' : cur ? 'border-[#ffe24a] bg-[#ffe24a]/25 text-white' : cleared ? 'border-ok/60 text-ok' : 'border-white/20 text-white/60'}`}
            >
              {bad ? '✕' : cleared ? '✓' : cur ? '▶' : '·'} {STAGE_LABELS[s]}
            </li>
          );
        })}
      </ol>

      {/* Instruments */}
      <div className="absolute bottom-[3%] right-[1.5%] flex w-[30%] gap-[0.8vw] rounded-xl border border-white/20 bg-black/55 p-[0.8vw] text-white backdrop-blur">
        <div className="w-1/3">
          <PressureMeter
            value={pressureValue}
            ok={pressureOk}
            label={`Seal ${attempt.dials.pressure} atm`}
          />
        </div>
        <div className="flex w-1/3 flex-col items-center">
          <div className="text-[clamp(8px,0.85vw,12px)] text-white/70">Fuel</div>
          <div className="mt-1 flex h-[clamp(36px,5vw,70px)] w-[40%] flex-col justify-end overflow-hidden rounded bg-white/15">
            <motion.div
              className={`w-full ${fuelFrac < 0.1 ? 'bg-bad' : 'bg-[#ffb35a]'}`}
              animate={{ height: `${fuelFrac * 100}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <div className="text-[clamp(8px,0.85vw,12px)] font-bold tabular-nums">
            {Math.round(fuelFrac * 100)}%
          </div>
        </div>
        <div className="flex w-1/3 flex-col items-center text-center">
          <div className="text-[clamp(8px,0.85vw,12px)] text-white/70">Crew</div>
          <div className="text-[clamp(14px,1.6vw,22px)]" aria-label={`${crew} astronauts`}>
            {crew ? '👩‍🚀'.repeat(crew) : '🤖'}
          </div>
          <div className="text-[clamp(8px,0.85vw,12px)] font-bold">
            {crew ? (
              <>
                <span className="text-ok">×{(1 + SCORING.crewBonus * crew).toFixed(1)}</span> /{' '}
                <span className="text-bad">−{SCORING.crewPenalty * crew}</span>
              </>
            ) : (
              '×1.0'
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-[3%] left-1/2 flex -translate-x-1/2 gap-2">
        {!done && launchesWatched > 0 && (
          <button
            type="button"
            className="tool-btn px-3 py-1 text-[12px]"
            onClick={() => setDone(true)}
          >
            Skip ⏭
          </button>
        )}
        {done && (
          <motion.button
            type="button"
            className="big-btn text-[clamp(16px,2.4vw,32px)]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => go('result')}
            autoFocus
          >
            {result.success ? 'MISSION REPORT ▸' : 'WHAT WENT WRONG? ▸'}
          </motion.button>
        )}
      </div>
    </Stage>
  );
}
