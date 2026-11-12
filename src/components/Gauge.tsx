import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion.ts';

interface Props {
  label: string;
  /** 0..1 position of the needle. */
  value: number;
  /** Green band as [from, to] in 0..1. Beyond `redFrom` is the red zone. */
  green: [number, number];
  redFrom: number;
  readout: string;
  status: 'ok' | 'bad' | 'idle';
}

const R = 46;
const CX = 60;
const CY = 58;

function arc(from: number, to: number) {
  const a0 = Math.PI * (1 - from);
  const a1 = Math.PI * (1 - to);
  const x0 = CX + R * Math.cos(a0);
  const y0 = CY - R * Math.sin(a0);
  const x1 = CX + R * Math.cos(a1);
  const y1 = CY - R * Math.sin(a1);
  return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`;
}

/** Semicircular gauge with a green band, red zone and an animated needle. */
export function Gauge({ label, value, green, redFrom, readout, status }: Props) {
  const reduced = useReducedMotion();
  const v = Math.max(0, Math.min(1, value));
  const angle = -90 + v * 180;
  return (
    <figure
      className="flex flex-col items-center"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-valuetext={`${readout}, ${status === 'bad' ? 'outside safe range' : status === 'ok' ? 'within safe range' : 'standby'}`}
    >
      <svg viewBox="0 0 120 70" className="w-full max-w-[160px]">
        <path d={arc(0, 1)} stroke="#24345f" strokeWidth="10" fill="none" />
        <path d={arc(green[0], green[1])} stroke="#3ddc84" strokeWidth="10" fill="none" />
        <path d={arc(redFrom, 1)} stroke="#ff6b6b" strokeWidth="10" fill="none" />
        <motion.g
          initial={false}
          animate={{ rotate: angle }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 10 }}
          style={{ originX: `${CX}px`, originY: `${CY}px` }}
        >
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - R + 4}
            stroke="#eef2fb"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </motion.g>
        <circle cx={CX} cy={CY} r="5" fill="#eef2fb" />
      </svg>
      <figcaption className="text-center text-xs">
        <div className="text-muted">{label}</div>
        <div
          className={`font-semibold tabular-nums ${status === 'bad' ? 'text-bad' : status === 'ok' ? 'text-ok' : 'text-ink'}`}
        >
          {status === 'bad' ? '✕ ' : status === 'ok' ? '✓ ' : ''}
          {readout}
        </div>
      </figcaption>
    </figure>
  );
}
