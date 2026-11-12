import { motion } from 'framer-motion';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  /** Safe zone [from, to] shown in green (Easy only). */
  zone?: readonly [number, number] | null;
  hint?: string;
  size?: number;
}

const START = -135; // degrees
const SWEEP = 270;

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}
function arc(r: number, from: number, to: number) {
  const [x0, y0] = polar(50, 50, r, from);
  const [x1, y1] = polar(50, 50, r, to);
  return `M${x0} ${y0} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

/** Rotary dial: drag around it, scroll, or use arrow keys. */
export function Dial({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  zone,
  hint,
  size = 120,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const frac = (value - min) / (max - min);
  const angle = START + frac * SWEEP;
  const toAngle = (v: number) => START + ((v - min) / (max - min)) * SWEEP;
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));

  const fromPointer = (e: PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // 0 = up
    if (deg > 180) deg -= 360;
    deg = Math.min(START + SWEEP, Math.max(START, deg));
    set(min + ((deg - START) / SWEEP) * (max - min));
  };

  const onKey = (e: KeyboardEvent) => {
    const big = (max - min) / 10;
    const map: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: big,
      PageDown: -big,
    };
    if (e.key in map) {
      e.preventDefault();
      set(value + map[e.key]);
    } else if (e.key === 'Home') set(min);
    else if (e.key === 'End') set(max);
  };

  const inZone = zone ? value >= zone[0] && value <= zone[1] : null;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        ref={ref}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} ${unit}`}
        className="cursor-grab touch-none select-none rounded-full outline-offset-4 active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.buttons && fromPointer(e)}
        onWheel={(e) => set(value + (e.deltaY < 0 ? step : -step))}
        onKeyDown={onKey}
      >
        <circle cx="50" cy="50" r="48" fill="#0b1630" stroke="#2a3a66" strokeWidth="2" />
        <path
          d={arc(40, START, START + SWEEP)}
          stroke="#1f2b4d"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        {zone && (
          <path
            d={arc(40, toAngle(zone[0]), toAngle(zone[1]))}
            stroke="#3ddc84"
            strokeWidth="7"
            fill="none"
            opacity="0.85"
          />
        )}
        <path
          d={arc(40, START, angle)}
          stroke={inZone === false ? '#ff6b6b' : '#ffb35a'}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {Array.from({ length: 11 }, (_, i) => {
          const [x0, y0] = polar(50, 50, 31, START + (i * SWEEP) / 10);
          const [x1, y1] = polar(50, 50, 35, START + (i * SWEEP) / 10);
          return (
            <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#5d6f9c" strokeWidth="1.2" />
          );
        })}
        {/* knob */}
        <circle cx="50" cy="50" r="22" fill="url(#knob)" stroke="#0b0f1e" strokeWidth="1.5" />
        <defs>
          <radialGradient id="knob" cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#5a6a90" />
            <stop offset="1" stopColor="#1a2440" />
          </radialGradient>
        </defs>
        <motion.g
          initial={false}
          animate={{ rotate: angle }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 14 }}
          style={{ originX: '50px', originY: '50px' }}
        >
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="14"
            stroke="#ff7a1a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="50" cy="16" r="2.5" fill="#ffe24a" />
        </motion.g>
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fontSize="11"
          fontWeight="800"
          fill="#eef2fb"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </text>
        <text x="50" y="64" textAnchor="middle" fontSize="6" fill="#aab6d3">
          {unit}
        </text>
      </svg>
      <div className="text-center">
        <div className="font-pixel text-[9px] uppercase tracking-wider text-[#ffe24a]">{label}</div>
        {inZone !== null && (
          <div className={`text-[11px] font-semibold ${inZone ? 'text-ok' : 'text-bad'}`}>
            {inZone ? '✓ in the safe zone' : '✕ outside the safe zone'}
          </div>
        )}
        {hint && (
          <div className="max-w-[150px] text-[11px] leading-tight text-[#cfe0ff]">{hint}</div>
        )}
        <div className="mt-1 flex justify-center gap-1">
          <button
            type="button"
            className="dial-btn"
            onClick={() => set(value - step)}
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <button
            type="button"
            className="dial-btn"
            onClick={() => set(value + step)}
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
