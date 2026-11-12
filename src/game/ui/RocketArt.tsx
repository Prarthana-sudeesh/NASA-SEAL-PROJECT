// Vector rocket drawn from the player's parts. Used by the blueprint builder and the launch.
import { motion } from 'framer-motion';
import { useId } from 'react';
import {
  getPart,
  type BodyPart,
  type EnginePart,
  type HullPart,
  type SlotKind,
} from '../config.ts';
import type { Build } from '../engine.ts';

const W = 100; // drawing width
const BODY_W = 44;
const X0 = (W - BODY_W) / 2;
const SEG_H = 30;

export interface RocketLayout {
  noseH: number;
  bodyY: number;
  bodyH: number;
  engineY: number;
  engineH: number;
  height: number;
}

export function layout(build: Build): RocketLayout {
  const body = getPart(build.body) as BodyPart | undefined;
  const segs = body?.segments ?? 3;
  const noseH = build.payload === 'payload-capsule' ? 56 : 46;
  const bodyY = noseH;
  const bodyH = segs * SEG_H;
  const engineY = bodyY + bodyH;
  const engineH = 34;
  return { noseH, bodyY, bodyH, engineY, engineH, height: engineY + engineH };
}

interface Props {
  build: Build;
  height: number;
  /** Highlighted slot (yellow box), as in a builder selection. */
  highlight?: SlotKind | null;
  /** Show dashed ghost outlines for empty slots. */
  ghosts?: boolean;
  flame?: number; // 0 = off, 1 = full
  className?: string;
}

export function RocketArt({
  build,
  height,
  highlight = null,
  ghosts = false,
  flame = 0,
  className,
}: Props) {
  const id = useId().replace(/:/g, '');
  const L = layout(build);
  const hull = getPart(build.hull) as HullPart | undefined;
  const engine = getPart(build.engine) as EnginePart | undefined;
  const body = getPart(build.body) as BodyPart | undefined;
  const c = hull?.color ?? '#dfe6f3';
  const d = hull?.dark ?? '#8a96aa';
  const flameH = 90 * flame;
  const total = L.height + 14 + flameH;
  const width = (height * (W + 40)) / total;
  const box: Record<SlotKind, [number, number, number, number]> = {
    payload: [X0 - 6, -4, BODY_W + 12, L.noseH + 4],
    antenna: [X0 + BODY_W - 2, L.noseH - 30, 30, 30],
    body: [X0 - 6, L.bodyY, BODY_W + 12, L.bodyH],
    hull: [X0 - 9, L.bodyY - 3, BODY_W + 18, L.bodyH + 6],
    engine: [X0 - 6, L.engineY, BODY_W + 12, L.engineH],
  };

  const ghost = (k: SlotKind) =>
    ghosts && !build[k] ? (
      <rect
        x={box[k][0]}
        y={box[k][1]}
        width={box[k][2]}
        height={box[k][3]}
        rx="4"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.7)"
        strokeDasharray="4 3"
        strokeWidth="1"
      />
    ) : null;

  return (
    <svg
      viewBox={`-20 -8 ${W + 40} ${total}`}
      height={height}
      width={width}
      className={className}
      role="img"
      aria-label="Your rocket"
    >
      <defs>
        <linearGradient id={`hull${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={d} />
          <stop offset="0.35" stopColor={c} />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.7" stopColor={c} />
          <stop offset="1" stopColor={d} />
        </linearGradient>
        <linearGradient id={`nose${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#3b4252" />
          <stop offset="0.45" stopColor="#9aa3b5" />
          <stop offset="1" stopColor="#2a303c" />
        </linearGradient>
        <linearGradient id={`fuel${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffd38a" />
          <stop offset="1" stopColor="#ff8a3d" />
        </linearGradient>
        <radialGradient id={`flame${id}`} cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor="#9ff3ff" />
          <stop offset="0.6" stopColor="#3a8dff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#3a8dff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Flame (blue plasma) */}
      {flame > 0 && engine && (
        <motion.ellipse
          cx={W / 2}
          cy={L.height + flameH * 0.45}
          rx={engine.id === 'engine-big' ? 22 : 16}
          ry={flameH * 0.55}
          fill={`url(#flame${id})`}
          initial={{ ry: flameH * 0.5, opacity: 0.9 }}
          animate={{ ry: [flameH * 0.5, flameH * 0.62, flameH * 0.5], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 0.18, repeat: Infinity }}
        />
      )}

      {/* Engine */}
      {engine ? (
        <motion.g
          key={engine.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          <rect x={X0 + 6} y={L.engineY} width={BODY_W - 12} height="8" fill="#4b5568" />
          {engine.id === 'engine-big' ? (
            <>
              <path
                d={`M${X0 + 2} ${L.engineY + 8} H${X0 + 20} L${X0 + 24} ${L.height} H${X0 - 4} Z`}
                fill="#3a4152"
                stroke="#1e2330"
              />
              <path
                d={`M${X0 + 24} ${L.engineY + 8} H${X0 + 42} L${X0 + 48} ${L.height} H${X0 + 20} Z`}
                fill="#3a4152"
                stroke="#1e2330"
              />
            </>
          ) : (
            <path
              d={`M${X0 + 12} ${L.engineY + 8} H${X0 + BODY_W - 12} L${X0 + BODY_W - 2} ${L.height} H${X0 + 2} Z`}
              fill={engine.id === 'engine-nuclear' ? '#2f3a2f' : '#3a4152'}
              stroke="#1e2330"
            />
          )}
          {engine.id === 'engine-nuclear' && (
            <motion.circle
              cx={W / 2}
              cy={L.engineY + 4}
              r="3"
              fill="#b6ff4a"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
          {/* fins */}
          <path
            d={`M${X0} ${L.engineY - 30} L${X0 - 16} ${L.engineY + 18} L${X0} ${L.engineY + 8} Z`}
            fill="#ff7a1a"
          />
          <path
            d={`M${X0 + BODY_W} ${L.engineY - 30} L${X0 + BODY_W + 16} ${L.engineY + 18} L${X0 + BODY_W} ${L.engineY + 8} Z`}
            fill="#ff7a1a"
          />
        </motion.g>
      ) : (
        ghost('engine')
      )}

      {/* Body / fuel tank */}
      {body ? (
        <motion.g
          key={`${body.id}-${hull?.id}`}
          initial={{ scaleY: 0.7, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          style={{ originY: `${L.bodyY}px` }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        >
          <rect
            x={X0}
            y={L.bodyY}
            width={BODY_W}
            height={L.bodyH}
            fill={hull ? `url(#hull${id})` : '#e6ecf5'}
            stroke={hull ? d : '#9aa6bd'}
            strokeWidth="1.2"
            strokeDasharray={hull ? undefined : '3 2'}
          />
          {Array.from({ length: body.segments }, (_, i) => (
            <g key={i}>
              <rect
                x={X0}
                y={L.bodyY + i * SEG_H}
                width={BODY_W}
                height="2.5"
                fill={d}
                opacity="0.7"
              />
              {/* cutaway fuel window */}
              <rect
                x={X0 + 8}
                y={L.bodyY + i * SEG_H + 7}
                width={6}
                height={SEG_H - 12}
                rx="2"
                fill={`url(#fuel${id})`}
                opacity="0.85"
              />
              {hull?.id === 'hull-steel' &&
                [0, 1, 2].map((r) => (
                  <circle
                    key={r}
                    cx={X0 + 22 + r * 7}
                    cy={L.bodyY + i * SEG_H + 6}
                    r="0.9"
                    fill={d}
                  />
                ))}
              {hull?.id === 'hull-carbon' &&
                [0, 1].map((r) => (
                  <rect
                    key={r}
                    x={X0 + 20 + r * 10}
                    y={L.bodyY + i * SEG_H + 12}
                    width="8"
                    height="8"
                    fill="#ff7a1a"
                    opacity="0.25"
                  />
                ))}
            </g>
          ))}
          <text
            x={W / 2 + 6}
            y={L.bodyY + L.bodyH / 2 + 3}
            textAnchor="middle"
            fontSize="8"
            fontWeight="800"
            fill="#0b0f1e"
            opacity="0.55"
            style={{ letterSpacing: 1 }}
          >
            {body.capacityT}t
          </text>
        </motion.g>
      ) : (
        ghost('body')
      )}

      {/* Antenna */}
      {build.antenna ? (
        <motion.g
          key={build.antenna}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          style={{ originX: `${X0 + BODY_W}px`, originY: `${L.noseH - 8}px` }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        >
          {build.antenna === 'antenna-low' && (
            <line
              x1={X0 + BODY_W - 4}
              y1={L.noseH - 8}
              x2={X0 + BODY_W + 16}
              y2={L.noseH - 34}
              stroke="#e8edf7"
              strokeWidth="2"
            />
          )}
          {build.antenna !== 'antenna-low' && (
            <>
              <line
                x1={X0 + BODY_W - 6}
                y1={L.noseH - 6}
                x2={X0 + BODY_W + 8}
                y2={L.noseH - 16}
                stroke="#9aa3b5"
                strokeWidth="2"
              />
              <path
                d={`M${X0 + BODY_W + 4} ${L.noseH - (build.antenna === 'antenna-deep' ? 32 : 26)} q${build.antenna === 'antenna-deep' ? 22 : 16} 8 6 ${build.antenna === 'antenna-deep' ? 26 : 18} z`}
                fill="#e8edf7"
                stroke="#8a96aa"
              />
            </>
          )}
          <motion.circle
            cx={X0 + BODY_W + 16}
            cy={L.noseH - 34}
            r="1.8"
            fill="#ff5a4a"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.g>
      ) : (
        ghost('antenna')
      )}

      {/* Payload / nose */}
      {build.payload ? (
        <motion.g
          key={build.payload}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        >
          <path
            d={`M${W / 2} 0 C${W / 2 + 14} ${L.noseH * 0.25} ${X0 + BODY_W} ${L.noseH * 0.6} ${X0 + BODY_W} ${L.noseH} H${X0} C${X0} ${L.noseH * 0.6} ${W / 2 - 14} ${L.noseH * 0.25} ${W / 2} 0 Z`}
            fill={`url(#nose${id})`}
            stroke="#1e2330"
            strokeWidth="1"
          />
          {build.payload === 'payload-capsule' ? (
            <>
              <circle
                cx={W / 2}
                cy={L.noseH * 0.62}
                r="7"
                fill="#1a2a52"
                stroke="#8a96aa"
                strokeWidth="1.5"
              />
              <circle cx={W / 2 - 2} cy={L.noseH * 0.6} r="2.5" fill="#8ff0ff" />
            </>
          ) : (
            <circle cx={W / 2} cy={L.noseH * 0.65} r="3.5" fill="#5ff3ff" />
          )}
          <rect x={X0} y={L.noseH - 4} width={BODY_W} height="4" fill="#ff7a1a" />
        </motion.g>
      ) : (
        ghost('payload')
      )}

      {/* Selection highlight */}
      {highlight && (
        <motion.rect
          x={box[highlight][0]}
          y={box[highlight][1]}
          width={box[highlight][2]}
          height={box[highlight][3]}
          rx="3"
          fill="rgba(255,226,74,0.12)"
          stroke="#ffe24a"
          strokeWidth="2.2"
          animate={{ opacity: [1, 0.45, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
      )}
    </svg>
  );
}

/** Tiny icon of one part, for the toolbar and part cards. */
export function PartIcon({ id, size = 40 }: { id: string; size?: number }) {
  const p = getPart(id);
  if (!p) return null;
  const base: Build = {
    payload: null,
    antenna: null,
    body: null,
    hull: null,
    engine: null,
    crew: 0,
  };
  if (p.kind === 'hull') {
    const h = p as HullPart;
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id={`hi-${id}`} x1="0" x2="1">
            <stop offset="0" stopColor={h.dark} />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor={h.dark} />
          </linearGradient>
        </defs>
        <rect x="8" y="4" width="24" height="32" rx="3" fill={`url(#hi-${id})`} stroke={h.dark} />
        <rect x="8" y="14" width="24" height="2" fill={h.dark} />
        <rect x="8" y="24" width="24" height="2" fill={h.dark} />
      </svg>
    );
  }
  const b = { ...base, [p.kind]: id };
  const L = layout({ ...b, body: p.kind === 'body' ? id : 'body-short' });
  const crop: Record<string, [number, number]> = {
    payload: [-8, L.noseH + 10],
    antenna: [L.noseH - 42, 46],
    body: [L.bodyY - 2, L.bodyH + 4],
    engine: [L.engineY - 32, L.engineH + 34],
  };
  const [y, h] = crop[p.kind];
  const show: Build = p.kind === 'body' ? { ...b, hull: 'hull-aluminium' } : b;
  const SL = layout(show);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-20 ${y} ${W + 40} ${Math.max(h, 40)}`}
      aria-hidden="true"
    >
      <g transform="translate(-20 -8)">
        <RocketArt build={show} height={SL.height + 14} />
      </g>
    </svg>
  );
}
