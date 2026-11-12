// SVG rocket parts. The builder, pre-launch review and launch animation all draw from these,
// so the rocket that flies looks exactly like the one the player built.
import type { ModuleType, RocketComponent } from '../../data/types.ts';

export const BODY_W = 60; // body width in SVG units
export const VIEW_W = 120; // total drawing width (room for antennas and engines)
const X0 = (VIEW_W - BODY_W) / 2;

const HULL = '#dfe6f3';
const HULL_DARK = '#9aa8c4';
const TRIM = '#3a4c80';

export function partHeight(module: ModuleType, c?: RocketComponent | null): number {
  switch (module) {
    case 'payload':
      return c?.id === 'habitat-module' ? 84 : c?.id === 'crew-capsule' ? 72 : 60;
    case 'comms':
      return 26;
    case 'pressure':
      return 34;
    case 'fuel':
      return c?.id === 'tank-large' ? 64 : c?.id === 'tank-medium' ? 50 : 36;
    case 'thruster':
      return 46;
    case 'protection':
      return 0;
  }
}

function Payload({ c, h }: { c: RocketComponent; h: number }) {
  const cx = VIEW_W / 2;
  const isProbe = c.id === 'probe-pod';
  const isHab = c.id === 'habitat-module';
  return (
    <g>
      <path
        d={`M ${cx} 0 C ${cx + 18} ${h * 0.25} ${X0 + BODY_W} ${h * 0.6} ${X0 + BODY_W} ${h} L ${X0} ${h} C ${X0} ${h * 0.6} ${cx - 18} ${h * 0.25} ${cx} 0 Z`}
        fill={HULL}
        stroke={HULL_DARK}
        strokeWidth="1.5"
      />
      {isProbe ? (
        <>
          <circle cx={cx} cy={h * 0.62} r="7" fill="#1a2a52" stroke={TRIM} />
          <circle cx={cx} cy={h * 0.62} r="3" fill="#7cc0ff" />
        </>
      ) : (
        <>
          {[-1, 0, 1].slice(isHab ? 0 : 1, isHab ? 3 : 3).map((k) => (
            <circle
              key={k}
              cx={cx + k * 13 - (isHab ? 0 : 6)}
              cy={h * 0.68}
              r="5"
              fill="#7cc0ff"
              stroke={TRIM}
              strokeWidth="1.5"
            />
          ))}
          {isHab && (
            <rect
              x={X0 + 6}
              y={h * 0.84}
              width={BODY_W - 12}
              height="5"
              rx="2"
              fill="#3ddc84"
              opacity="0.8"
            />
          )}
        </>
      )}
      <rect x={X0} y={h - 4} width={BODY_W} height="4" fill={TRIM} />
    </g>
  );
}

function Comms({ c, h }: { c: RocketComponent; h: number }) {
  const tier = c.module === 'comms' ? c.rangeTier : 1;
  return (
    <g>
      <rect
        x={X0}
        y={0}
        width={BODY_W}
        height={h}
        fill={HULL}
        stroke={HULL_DARK}
        strokeWidth="1.5"
      />
      <rect x={X0 + 6} y={h / 2 - 3} width={BODY_W - 12} height="6" rx="2" fill={TRIM} />
      {tier === 1 && (
        <line
          x1={X0 + BODY_W}
          y1={h / 2}
          x2={X0 + BODY_W + 18}
          y2={2}
          stroke="#eef2fb"
          strokeWidth="2"
        />
      )}
      {tier >= 2 && (
        <path
          d={`M ${X0 + BODY_W + 2} ${h / 2} q 16 -14 ${tier === 3 ? 26 : 18} -2 q -8 ${tier === 3 ? 22 : 16} -${tier === 3 ? 26 : 18} 2 z`}
          fill="#eef2fb"
          stroke={HULL_DARK}
        />
      )}
      {tier === 3 && (
        <path
          d={`M ${X0 - 2} ${h / 2} q -14 -10 -20 0 q 6 10 20 0 z`}
          fill="#eef2fb"
          stroke={HULL_DARK}
        />
      )}
      <circle cx={X0 + 10} cy={h / 2} r="2" fill="#ff7a1a" />
    </g>
  );
}

function Pressure({ c, h }: { c: RocketComponent; h: number }) {
  const n = c.id === 'pressure-extreme' ? 3 : c.id === 'pressure-reinforced' ? 2 : 1;
  const stroke = c.id === 'pressure-extreme' ? 3 : c.id === 'pressure-reinforced' ? 2 : 1;
  return (
    <g>
      <rect
        x={X0}
        y={0}
        width={BODY_W}
        height={h}
        fill="#c9d3e6"
        stroke={HULL_DARK}
        strokeWidth="1.5"
      />
      {Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          cx={X0 + (BODY_W / (n + 1)) * (i + 1)}
          cy={h / 2}
          r={n === 1 ? 12 : 9}
          fill="#7a8fb8"
          stroke="#eef2fb"
          strokeWidth={stroke}
        />
      ))}
    </g>
  );
}

function Fuel({ c, h }: { c: RocketComponent; h: number }) {
  return (
    <g>
      <rect
        x={X0}
        y={0}
        width={BODY_W}
        height={h}
        fill={HULL}
        stroke={HULL_DARK}
        strokeWidth="1.5"
      />
      <rect
        x={X0 + 5}
        y={4}
        width={BODY_W - 10}
        height={h - 8}
        rx="6"
        fill="#ffb347"
        opacity="0.85"
      />
      <rect
        x={X0 + 5}
        y={4}
        width={BODY_W - 10}
        height={(h - 8) * 0.25}
        rx="6"
        fill="#ffd38a"
        opacity="0.9"
      />
      <text
        x={VIEW_W / 2}
        y={h / 2 + 4}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#3a1a02"
      >
        {c.module === 'fuel' ? `${c.fuelT}t` : ''}
      </text>
    </g>
  );
}

function Nozzle({ c, x, w }: { c: RocketComponent; x: number; w: number }) {
  const cx = x + w / 2;
  const id = c.id;
  const bell = id === 'chem-mk2' ? 1.15 : id === 'ion-hybrid' ? 0.75 : 1;
  const top = id === 'nuclear-thermal' ? 18 : 10;
  const bw = (w / 2) * bell;
  return (
    <g>
      <rect
        x={cx - w * 0.3}
        y={0}
        width={w * 0.6}
        height={top}
        fill={id === 'nuclear-thermal' ? '#56607a' : '#7f8aa3'}
        stroke={HULL_DARK}
      />
      {id === 'nuclear-thermal' && <circle cx={cx} cy={top / 2} r="4" fill="#c6ff4a" />}
      {id === 'ion-hybrid' ? (
        <>
          <path
            d={`M ${cx - bw} ${top} L ${cx + bw} ${top} L ${cx + bw * 0.9} ${top + 16} L ${cx - bw * 0.9} ${top + 16} Z`}
            fill="#2a3a66"
            stroke="#7cc0ff"
          />
          {[-1, 0, 1].map((k) => (
            <line
              key={k}
              x1={cx + k * 5}
              y1={top + 2}
              x2={cx + k * 5}
              y2={top + 14}
              stroke="#7cc0ff"
              strokeWidth="1.5"
            />
          ))}
        </>
      ) : (
        <path
          d={`M ${cx - w * 0.22} ${top} L ${cx + w * 0.22} ${top} L ${cx + bw} ${top + 28} L ${cx - bw} ${top + 28} Z`}
          fill="#4b556e"
          stroke={HULL_DARK}
        />
      )}
    </g>
  );
}

function Thrusters({ items, h }: { items: RocketComponent[]; h: number }) {
  const n = items.length;
  const slotW = n === 2 ? BODY_W * 0.62 : BODY_W * 0.8;
  const total = slotW * n;
  const start = VIEW_W / 2 - total / 2;
  return (
    <g>
      <rect x={X0 + 4} y={0} width={BODY_W - 8} height="6" fill={TRIM} />
      {items.map((c, i) => (
        <g key={i} transform={`translate(0 6)`}>
          <Nozzle c={c} x={start + i * slotW} w={slotW} />
        </g>
      ))}
      {/* fins */}
      <path d={`M ${X0} ${-30} L ${X0 - 16} ${h - 10} L ${X0} ${h - 18} Z`} fill="#ff7a1a" />
      <path
        d={`M ${X0 + BODY_W} ${-30} L ${X0 + BODY_W + 16} ${h - 10} L ${X0 + BODY_W} ${h - 18} Z`}
        fill="#ff7a1a"
      />
    </g>
  );
}

export function PartGraphic({
  module,
  component,
  height,
}: {
  module: ModuleType;
  component: RocketComponent;
  height: number;
}) {
  switch (module) {
    case 'payload':
      return <Payload c={component} h={height} />;
    case 'comms':
      return <Comms c={component} h={height} />;
    case 'pressure':
      return <Pressure c={component} h={height} />;
    case 'fuel':
      return <Fuel c={component} h={height} />;
    case 'thruster':
      return <Thrusters items={[component]} h={height} />;
    default:
      return null;
  }
}

export { Thrusters as ThrusterCluster };

export const PROTECTION_STYLE: Record<
  string,
  { stroke: string; width: number; dash?: string; label: string }
> = {
  'thermal-blanket': { stroke: '#e6c14a', width: 3, dash: '6 3', label: 'gold foil' },
  'heat-shield': { stroke: '#2b2f3a', width: 6, label: 'charcoal' },
  'cryo-heat-composite': { stroke: '#8f7bff', width: 6, label: 'violet' },
  'lava-ablator': { stroke: '#b5341f', width: 7, label: 'red-black' },
};

/** Small standalone icon of a component, used on palette cards. */
export function PartIcon({ component, size = 44 }: { component: RocketComponent; size?: number }) {
  if (component.module === 'protection') {
    const s = PROTECTION_STYLE[component.id];
    return (
      <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
        <path
          d="M22 4 C30 10 32 18 32 26 L32 40 L12 40 L12 26 C12 18 14 10 22 4 Z"
          fill="#dfe6f3"
        />
        <path
          d="M22 1 C33 8 35 18 35 26 L35 43 L9 43 L9 26 C9 18 11 8 22 1 Z"
          fill="none"
          stroke={s?.stroke ?? '#fff'}
          strokeWidth={Math.max(2, (s?.width ?? 3) * 0.6)}
          strokeDasharray={s?.dash}
        />
      </svg>
    );
  }
  const h = partHeight(component.module, component);
  const pad = component.module === 'thruster' ? 36 : 4;
  const top = component.module === 'thruster' ? -32 : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-6 ${top - 2} ${VIEW_W + 12} ${h + pad}`}
      aria-hidden="true"
    >
      <PartGraphic module={component.module} component={component} height={h} />
    </svg>
  );
}
