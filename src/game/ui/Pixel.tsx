// Original pixel-art characters drawn from character grids (one character = one pixel).
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

export type Palette = Record<string, string>;

const ASTRO_PALETTE: Palette = {
  K: '#0b0f1e', // outline
  W: '#ffffff',
  w: '#c9d3e6', // suit shade
  g: '#8e9bb5',
  b: '#4f6bff', // visor
  B: '#2a3fbf',
  c: '#8ff0ff', // visor shine
  N: '#3b4fd8', // gloves & boots
  n: '#2433a0',
  O: '#f2a65a', // belt / patch
  R: '#ff5a4a', // chest light
  G: '#3ddc84',
};

/** 20 × 26 astronaut. */
export const ASTRONAUT = [
  '......KKKKKKKK......',
  '....KKWWWWWWWWKK....',
  '...KWWWWWWWWWWwwK...',
  '..KWWWKKKKKKKKWwwK..',
  '..KWWKccbbbbbbKwwK..',
  '.KWWKcccbbbbbbbKwwK.',
  '.KWWKccbbbbbbbBKwwK.',
  '.KWWKcbbbbbbbbBKwwK.',
  '.KWWKbbbbbbbbBBKwwK.',
  '.KWwKbbbbbbbBBBKwgK.',
  '..KWwKKKKKKKKKKwgK..',
  '..KwWWWWWWWWWWWwgK..',
  '...KKwwwwwwwwwwKK...',
  '..KWWKKKKKKKKKKWwK..',
  '.KWWWKbbbbbbbbKWwwK.',
  '.KWWWKbRbGbcbbKWwwK.',
  'KNWWWKbbbbbbbbKWwwNK',
  'KNNWWKKKKKKKKKKWwNNK',
  'KNNKWwOOOOOOOOwwKNnK',
  '.KK.KWWWWWWWWwwK.KK.',
  '....KWWWWKKWWwwK....',
  '....KWWWK..KWwwK....',
  '...KNNNNK..KNNnnK...',
  '...KNNNNK..KNNnnK...',
  '...KKKKKK..KKKKKK...',
  '....................',
];

const SCI_PALETTE: Palette = {
  K: '#0b0f1e',
  H: '#4a2c1d', // hair
  h: '#6b4430',
  S: '#f0c39b', // skin
  s: '#d29f78',
  c: '#9fe6ff', // glasses lens
  L: '#f4f6fb', // lab coat
  l: '#c6cedc',
  T: '#ff7a1a', // tie
  P: '#2c3550', // trousers
  D: '#1b1b22', // shoes
  C: '#7a5a3a', // clipboard
  p: '#ffffff',
};

/** 20 × 26 scientist with glasses, lab coat and clipboard. */
export const SCIENTIST = [
  '.....KKKKKKKKK......',
  '....KHHHHHHHHHK.....',
  '...KHHhHHHHHhHHK....',
  '...KHHSSSSSSSHHK....',
  '...KHSSSSSSSSSHK....',
  '...KSKKKKSKKKKSK....',
  '...KSKccKSKccKSK....',
  '...KSSKKSSSKKSSK....',
  '...KSSSSSsSSSSSK....',
  '....KSSSKKKSSSK.....',
  '.....KKSSSSSKK......',
  '...KKLLKKTKKLLKK....',
  '..KLLLLLKTTKLLLLK...',
  '.KLLLLLLKTTKLLLLLK..',
  '.KLLlLLLLKKLLLLlLK..',
  '.KLLlLLLLLLLLKKKKKK.',
  '.KLLlKLLLLLLLKCppCK.',
  '.KSSKKLLLLLLLKCppCK.',
  '.KKKKKLLLLLLLKCppCK.',
  '....KLLLLLLLLKKKKKK.',
  '....KLLLLlLLLLK.....',
  '....KPPPPKKPPPK.....',
  '....KPPPK..KPPK.....',
  '....KPPPK..KPPK.....',
  '...KDDDDK..KDDDK....',
  '...KKKKKK..KKKKK....',
];

/** Scientist with eyes closed (blink frame). */
const SCIENTIST_BLINK = SCIENTIST.map((row, y) => (y === 6 ? '...KSKKKKSKKKKSK....' : row));

export function PixelGrid({
  rows,
  palette,
  scale,
  title,
}: {
  rows: string[];
  palette: Palette;
  scale?: number;
  title?: string;
}) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      if (palette[ch])
        rects.push(
          <rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={palette[ch]} />,
        );
      x += run;
    }
  });
  return (
    <svg
      width={scale ? w * scale : '100%'}
      height={scale ? h * scale : undefined}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {rects}
    </svg>
  );
}

function useBlink(intervalMs: number) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    const t = window.setInterval(() => {
      setClosed(true);
      window.setTimeout(() => setClosed(false), 140);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return closed;
}

interface CharProps {
  /** Pixel size in px; omit to fill the wrapper's width. */
  scale?: number;
  name?: string;
  className?: string;
  /** Walk in from the left when first shown. */
  enter?: boolean;
}

function NameTag({ name }: { name: string }) {
  return (
    <div
      className="pixel-name absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px]"
      aria-hidden="true"
    >
      {name}
    </div>
  );
}

export function Astronaut({ scale, name, className = '', enter = true }: CharProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`relative ${className}`}
      initial={enter && !reduced ? { x: -160, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70, damping: 14 }}
    >
      {name && <NameTag name={name} />}
      <motion.div
        animate={reduced ? undefined : { y: ['0%', '-2.5%', '0%'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <PixelGrid
          rows={ASTRONAUT}
          palette={ASTRO_PALETTE}
          scale={scale}
          title={name ? `Astronaut ${name}` : 'Astronaut'}
        />
        {/* Visor glint sweep */}
        {!reduced && (
          <motion.div
            className="pointer-events-none absolute"
            style={{ left: '25%', top: '15.4%', width: '50%', height: '23%', overflow: 'hidden' }}
            aria-hidden="true"
          >
            <motion.div
              className="absolute h-full w-1/4 -skew-x-12 bg-white/60"
              animate={{ x: ['-150%', '450%'] }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
        {/* Blinking chest light */}
        <motion.div
          className="pointer-events-none absolute rounded-[1px] bg-[#ff5a4a]"
          style={{ left: '35%', top: '57.7%', width: '5%', height: '3.85%' }}
          animate={reduced ? undefined : { opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          aria-hidden="true"
        />
      </motion.div>
      <div
        className="mx-auto mt-1 h-2 w-3/4 rounded-[50%] bg-black/40 blur-[2px]"
        aria-hidden="true"
      />
    </motion.div>
  );
}

export function Scientist({ scale, name, className = '', enter = true }: CharProps) {
  const reduced = useReducedMotion();
  const blink = useBlink(3200);
  return (
    <motion.div
      className={`relative ${className}`}
      initial={enter && !reduced ? { x: 160, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70, damping: 14, delay: 0.25 }}
    >
      {name && <NameTag name={name} />}
      <motion.div
        animate={reduced ? undefined : { y: ['0%', '-1.5%', '0%'], rotate: [0, -1, 0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <PixelGrid
          rows={blink && !reduced ? SCIENTIST_BLINK : SCIENTIST}
          palette={SCI_PALETTE}
          scale={scale}
          title={name ?? 'Scientist'}
        />
      </motion.div>
      <div
        className="mx-auto mt-1 h-2 w-3/4 rounded-[50%] bg-black/40 blur-[2px]"
        aria-hidden="true"
      />
    </motion.div>
  );
}

/** Typing speech bubble. */
export function SpeechBubble({
  text,
  speaker,
  className = '',
}: {
  text: string;
  speaker: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) {
      setN(text.length);
      return;
    }
    setN(0);
    const t = window.setInterval(() => setN((c) => (c >= text.length ? c : c + 2)), 22);
    return () => window.clearInterval(t);
  }, [text, reduced]);
  return (
    <motion.div
      key={text}
      initial={{ scale: 0.85, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`speech relative max-w-[min(420px,80vw)] rounded-2xl border-2 border-[#0b0f1e] bg-white px-4 py-3 text-[13px] leading-snug text-[#0b0f1e] shadow-[0_4px_0_#0b0f1e] ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-1 font-pixel text-[9px] uppercase tracking-wider text-[#2a3fbf]">
        {speaker}
      </div>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      <span className="sr-only">{text}</span>
      {n < text.length && (
        <span
          className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[#0b0f1e] align-middle"
          aria-hidden="true"
        />
      )}
    </motion.div>
  );
}
