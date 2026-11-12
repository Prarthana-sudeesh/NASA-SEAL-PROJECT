import { getComponent } from '../../config/components.ts';
import type { RocketBuild, RocketComponent } from '../../data/types.ts';
import {
  BODY_W,
  PartGraphic,
  PROTECTION_STYLE,
  ThrusterCluster,
  VIEW_W,
  partHeight,
} from './RocketParts.tsx';

export interface RocketLayout {
  width: number;
  height: number;
  /** y where the engine bells end (flame origin). */
  nozzleY: number;
}

interface Section {
  module: 'payload' | 'comms' | 'pressure' | 'fuel';
  c: RocketComponent;
  y: number;
  h: number;
}

export function layoutRocket(build: RocketBuild) {
  const sections: Section[] = [];
  let y = 0;
  const push = (module: Section['module'], id: string | null) => {
    const c = getComponent(id);
    if (!c) return;
    const h = partHeight(module, c);
    sections.push({ module, c, y, h });
    y += h;
  };
  push('payload', build.payload);
  push('comms', build.comms);
  push('pressure', build.pressure);
  build.fuel.forEach((id) => push('fuel', id));
  const bodyEnd = y;
  const thrusters = build.thrusters
    .map((id) => getComponent(id))
    .filter(Boolean) as RocketComponent[];
  const thrusterH = thrusters.length ? partHeight('thruster') : 0;
  return { sections, bodyEnd, thrusters, thrusterH, total: bodyEnd + thrusterH };
}

interface Props {
  build: RocketBuild;
  height?: number;
  flame?: boolean;
  flameScale?: number;
  className?: string;
  title?: string;
  crew?: number;
}

/** The assembled rocket, drawn from the same parts used in the builder. */
export function RocketSvg({
  build,
  height = 320,
  flame = false,
  flameScale = 1,
  className,
  title,
  crew,
}: Props) {
  const L = layoutRocket(build);
  const prot = build.protection ? PROTECTION_STYLE[build.protection] : null;
  const flameH = 70 * flameScale;
  const vbH = Math.max(L.total, 60) + 20 + flameH;
  const width = (height * (VIEW_W + 40)) / vbH;
  const label = title ?? describeBuild(build);
  return (
    <svg
      viewBox={`-20 -10 ${VIEW_W + 40} ${vbH}`}
      height={height}
      width={width}
      className={className}
      role="img"
      aria-label={label}
    >
      {L.thrusters.length > 0 && (
        <g transform={`translate(0 ${L.bodyEnd})`}>
          <ThrusterCluster items={L.thrusters} h={L.thrusterH} />
        </g>
      )}
      {L.sections.map((s, i) => (
        <g key={i} transform={`translate(0 ${s.y})`}>
          <PartGraphic module={s.module} component={s.c} height={s.h} />
        </g>
      ))}
      {prot && L.bodyEnd > 0 && (
        <path
          d={`M ${VIEW_W / 2} -6 C ${VIEW_W / 2 + 22} ${L.bodyEnd * 0.1} ${(VIEW_W + BODY_W) / 2 + 5} ${L.bodyEnd * 0.25} ${(VIEW_W + BODY_W) / 2 + 5} ${Math.min(80, L.bodyEnd)} L ${(VIEW_W + BODY_W) / 2 + 5} ${L.bodyEnd + 4} L ${(VIEW_W - BODY_W) / 2 - 5} ${L.bodyEnd + 4} L ${(VIEW_W - BODY_W) / 2 - 5} ${Math.min(80, L.bodyEnd)} C ${(VIEW_W - BODY_W) / 2 - 5} ${L.bodyEnd * 0.25} ${VIEW_W / 2 - 22} ${L.bodyEnd * 0.1} ${VIEW_W / 2} -6 Z`}
          fill="none"
          stroke={prot.stroke}
          strokeWidth={prot.width}
          strokeDasharray={prot.dash}
          strokeLinejoin="round"
          opacity="0.9"
        />
      )}
      {crew !== undefined && crew > 0 && (
        <g aria-hidden="true">
          {Array.from({ length: crew }, (_, i) => (
            <circle
              key={i}
              cx={VIEW_W / 2 - (crew - 1) * 4 + i * 8}
              cy={28}
              r="2.6"
              fill="#ff7a1a"
            />
          ))}
        </g>
      )}
      {flame && L.thrusters.length > 0 && (
        <g transform={`translate(0 ${L.total})`}>
          <ellipse
            cx={VIEW_W / 2}
            cy={flameH * 0.45}
            rx={BODY_W * 0.38}
            ry={flameH * 0.5}
            fill="#ff7a1a"
            opacity="0.85"
          >
            <animate
              attributeName="ry"
              values={`${flameH * 0.45};${flameH * 0.55};${flameH * 0.45}`}
              dur="0.25s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse
            cx={VIEW_W / 2}
            cy={flameH * 0.3}
            rx={BODY_W * 0.2}
            ry={flameH * 0.32}
            fill="#ffe08a"
          />
        </g>
      )}
    </svg>
  );
}

export function describeBuild(build: RocketBuild): string {
  const parts = [
    build.payload,
    build.comms,
    build.pressure,
    ...build.fuel,
    ...build.thrusters,
    build.protection,
  ]
    .map((id) => getComponent(id)?.name)
    .filter(Boolean);
  if (parts.length === 0) return 'Empty rocket';
  return `Rocket with ${parts.join(', ')}${build.crew ? `, ${build.crew} crew` : ''}`;
}
