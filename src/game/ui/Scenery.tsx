// Backgrounds: futuristic mission-control room, blueprint grid, starfield. Original artwork.
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { PlanetVisual } from '../../components/PlanetVisual.tsx';
import type { Planet } from '../../data/types.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rnd = seeded(7);
export const STARS = Array.from({ length: 140 }, () => ({
  x: rnd() * 100,
  y: rnd() * 100,
  r: rnd() * 1.4 + 0.3,
  d: rnd() * 4 + 2,
}));

export function Starfield({
  className = '',
  twinkle = true,
}: {
  className?: string;
  twinkle?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <svg
      className={`absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r * 0.12}
          fill="#fff"
          className={twinkle && !reduced && i % 3 === 0 ? 'twinkle' : undefined}
          style={{ animationDuration: `${s.d}s` }}
          opacity={0.75}
        />
      ))}
    </svg>
  );
}

/** A 16:9 game stage that scales with the window. Children use % positioning. */
export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto aspect-video w-full max-w-[min(100%,calc((100vh-24px)*16/9))] overflow-clip rounded-2xl border border-white/10 shadow-2xl ${className}`}
    >
      {children}
    </div>
  );
}

/** Mission control: curved windows onto space, wall screens, central hologram projector. */
export function CommandCenter({ children }: { children?: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-clip bg-[#070b18]">
      {/* Space beyond the windows */}
      <div className="absolute inset-x-0 top-0 h-[62%] bg-[radial-gradient(ellipse_at_50%_120%,#1d3a7a_0%,#0a1330_45%,#050814_80%)]">
        <Starfield />
        <motion.div
          className="absolute -bottom-[55%] left-[-10%] h-[110%] w-[120%] rounded-[50%] bg-[radial-gradient(circle_at_50%_10%,#7cc8ff,#2a6fd0_35%,#0d2c66_60%,transparent_75%)] opacity-80"
          animate={reduced ? undefined : { x: ['0%', '-2%', '0%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      {/* Window frame: curved ceiling ring and angled mullions */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 160 90"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="metal" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2a3550" />
            <stop offset="1" stopColor="#121a2e" />
          </linearGradient>
          <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1a2440" />
            <stop offset="1" stopColor="#090d1a" />
          </linearGradient>
          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#5ff3ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#5ff3ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* ceiling */}
        <path d="M0 0 H160 V10 Q80 26 0 10 Z" fill="url(#metal)" />
        <path
          d="M0 10 Q80 26 160 10"
          stroke="#ffb35a"
          strokeWidth="0.35"
          fill="none"
          opacity="0.8"
        />
        <path d="M0 13 Q80 29 160 13" stroke="#3a4c80" strokeWidth="0.6" fill="none" />
        {/* mullions */}
        {[12, 34, 58, 80, 102, 126, 148].map((x, i) => (
          <path
            key={i}
            d={`M${x} ${14 + Math.abs(80 - x) * -0.08 + 6} L${x + (x < 80 ? 4 : x > 80 ? -4 : 0)} 56`}
            stroke="#1a2440"
            strokeWidth="2.2"
          />
        ))}
        {/* cross braces */}
        <path
          d="M12 30 L34 52 M34 30 L58 52 M102 52 L126 30 M126 52 L148 30"
          stroke="#1a2440"
          strokeWidth="0.9"
        />
        {/* wall band below windows */}
        <rect x="0" y="54" width="160" height="6" fill="url(#metal)" />
        <rect x="0" y="54" width="160" height="0.4" fill="#5ff3ff" opacity="0.5" />
        {/* floor */}
        <path d="M0 60 H160 V90 H0 Z" fill="url(#floor)" />
        {[...Array(9)].map((_, i) => (
          <path
            key={i}
            d={`M${80 + (i - 4) * 6} 60 L${80 + (i - 4) * 30} 90`}
            stroke="#1f2b4d"
            strokeWidth="0.3"
          />
        ))}
        {[64, 69, 76, 85].map((y) => (
          <path key={y} d={`M0 ${y} H160`} stroke="#1f2b4d" strokeWidth="0.3" />
        ))}
        {/* hologram projector base */}
        <ellipse
          cx="80"
          cy="74"
          rx="22"
          ry="4.5"
          fill="#0d1428"
          stroke="#5ff3ff"
          strokeWidth="0.4"
        />
        <ellipse cx="80" cy="73" rx="16" ry="3" fill="url(#glow)" />
        {/* consoles */}
        <path d="M6 78 L40 70 L44 74 L10 84 Z" fill="#141c33" stroke="#2a3a66" strokeWidth="0.3" />
        <path
          d="M154 78 L120 70 L116 74 L150 84 Z"
          fill="#141c33"
          stroke="#2a3a66"
          strokeWidth="0.3"
        />
        {[...Array(8)].map((_, i) => (
          <rect
            key={i}
            x={12 + i * 3.6}
            y={77 - i * 0.9}
            width="2"
            height="0.8"
            fill={i % 3 ? '#5ff3ff' : '#ffb35a'}
            opacity="0.8"
          />
        ))}
      </svg>
      {children}
    </div>
  );
}

/** Rotating holographic planet floating above the projector. */
export function Hologram({ planet, size }: { planet: Planet; size: string }) {
  const reduced = useReducedMotion();
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* light cone */}
      <div className="absolute left-1/2 top-[55%] h-[95%] w-[70%] -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,rgba(95,243,255,0.18))] [clip-path:polygon(20%_0,80%_0,100%_100%,0_100%)]" />
      <motion.div
        key={planet.id}
        className="relative h-full w-full"
        initial={reduced ? false : { scale: 0.2, opacity: 0, rotate: -40 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 14 }}
      >
        <motion.div
          className="h-full w-full"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          <PlanetVisual
            planet={planet}
            size={1000}
            className="h-full w-full opacity-90 [filter:drop-shadow(0_0_18px_#5ff3ff)_saturate(1.3)]"
            decorative
          />
        </motion.div>
        {/* scanlines + orbit rings */}
        <div className="absolute inset-0 rounded-full bg-[repeating-linear-gradient(0deg,rgba(95,243,255,0.12)_0_2px,transparent_2px_5px)] mix-blend-screen" />
        <motion.div
          className="absolute inset-[-12%] rounded-full border border-[#5ff3ff]/50"
          style={{ rotateX: 70 }}
          animate={reduced ? undefined : { rotateZ: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-[-24%] rounded-full border border-dashed border-[#ffb35a]/40"
          style={{ rotateX: 74 }}
          animate={reduced ? undefined : { rotateZ: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    </div>
  );
}

/** Wall-mounted screen with a soft glow and occasional flicker. */
export function WallScreen({
  children,
  className = '',
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      aria-label={title}
      className={`absolute overflow-hidden rounded-lg border border-[#5ff3ff]/40 bg-[#06223a]/85 p-[1.2%] text-[#cdf8ff] shadow-[0_0_24px_rgba(95,243,255,0.25)] backdrop-blur-sm ${className}`}
      initial={reduced ? false : { opacity: 0, scaleY: 0.05 }}
      animate={{ opacity: [0, 1, 0.85, 1], scaleY: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="mb-1 flex items-center justify-between font-pixel text-[clamp(6px,0.75vw,9px)] uppercase tracking-widest text-[#5ff3ff]">
        <span>{title}</span>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3ddc84]" />
      </div>
      {children}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0_1px,transparent_1px_3px)]" />
    </motion.section>
  );
}

/** Blueprint grid like an engineering drawing board. */
export function Blueprint({ children }: { children?: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-clip bg-[radial-gradient(ellipse_at_50%_40%,#2d6fb8,#14417a_60%,#0b2a52)]">
      <motion.div
        className="absolute inset-[-40px]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '40px 40px, 40px 40px, 8px 8px, 8px 8px',
        }}
        animate={reduced ? undefined : { x: [0, 40], y: [0, 40] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(5,15,35,0.6))]" />
      {children}
    </div>
  );
}
