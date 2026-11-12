import { useId } from 'react';
import type { Planet } from '../data/types.ts';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Temperature → base colour (cold blue/white → temperate teal/green → hot orange → lava red). */
export function tempColor(T: number): { base: string; dark: string; light: string } {
  if (T < 180) return { base: '#9fd3f5', dark: '#3b6b93', light: '#f2fbff' };
  if (T < 240) return { base: '#6fb7d6', dark: '#2c5a78', light: '#d8f1ff' };
  if (T < 330) return { base: '#4fae8f', dark: '#1f5a59', light: '#bfeedd' };
  if (T < 500) return { base: '#c9a46a', dark: '#6b4a2a', light: '#f3dcae' };
  if (T < 900) return { base: '#e07a3a', dark: '#6e2a12', light: '#ffc08a' };
  return { base: '#ff5a2a', dark: '#4a0d06', light: '#ffd27a' };
}

interface Props {
  planet: Planet;
  size?: number;
  className?: string;
  decorative?: boolean;
}

/** Procedurally generated planet, tinted by equilibrium temperature. */
export function PlanetVisual({ planet, size = 96, className = '', decorative = false }: Props) {
  const uid = useId().replace(/:/g, '');
  const T = planet.eqTempK.value;
  const c = tempColor(T);
  const h = hash(planet.id);
  const atmo = planet.atmosphere.value;
  const bands = 3 + (h % 4);
  const tilt = (h % 40) - 20;
  const r = 40 + Math.min(8, planet.radiusEarth.value * 3);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={
        decorative ? undefined : `Illustration of ${planet.name}, about ${Math.round(T)} K`
      }
    >
      <defs>
        <radialGradient id={`g${uid}`} cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="45%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
        <clipPath id={`c${uid}`}>
          <circle cx="50" cy="50" r={r} />
        </clipPath>
        <radialGradient id={`s${uid}`} cx="30%" cy="30%" r="90%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      {(atmo === 'thick' || atmo === 'earthlike') && (
        <circle
          cx="50"
          cy="50"
          r={r + 4}
          fill="none"
          stroke={c.light}
          strokeOpacity="0.35"
          strokeWidth="4"
        />
      )}
      {atmo === 'scorching' && <circle cx="50" cy="50" r={r + 5} fill="#ff6a2a" opacity="0.18" />}
      <circle cx="50" cy="50" r={r} fill={`url(#g${uid})`} />
      <g clipPath={`url(#c${uid})`} transform={`rotate(${tilt} 50 50)`}>
        {Array.from({ length: bands }, (_, i) => (
          <rect
            key={i}
            x="0"
            y={14 + i * (72 / bands) + ((h >>> (i * 3)) % 6)}
            width="100"
            height={3 + ((h >>> (i * 2)) % 5)}
            fill={i % 2 ? c.dark : c.light}
            opacity="0.22"
          />
        ))}
        {atmo === 'frozen' && (
          <>
            <ellipse cx="50" cy={50 - r + 6} rx={r * 0.7} ry="9" fill="#ffffff" opacity="0.8" />
            <ellipse cx="50" cy={50 + r - 6} rx={r * 0.6} ry="7" fill="#ffffff" opacity="0.7" />
          </>
        )}
        {atmo === 'scorching' &&
          [0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={25 + ((h >>> (i * 4)) % 50)}
              cy={25 + ((h >>> (i * 5)) % 50)}
              r={3 + (i % 3)}
              fill="#ffe08a"
              opacity="0.65"
            />
          ))}
      </g>
      <circle cx="50" cy="50" r={r} fill={`url(#s${uid})`} />
    </svg>
  );
}
