import { componentsFor } from '../config/components.ts';
import { DIFFICULTY } from '../config/difficulty.ts';
import { ATMOSPHERE_INFO } from '../config/physics.ts';
import { planetsFor } from '../data/planets.ts';
import type { Difficulty, Planet, Provenance } from '../data/types.ts';
import { kelvinToCelsius } from '../engine/physics.ts';
import { missionRequirements } from '../engine/requirements.ts';

export interface InfoRow {
  label: string;
  value: string;
  unit?: string;
  source: Provenance;
  note?: string;
}

const n = (v: number, d = 2) => v.toLocaleString(undefined, { maximumFractionDigits: d });

export function planetStatRows(p: Planet): InfoRow[] {
  return [
    {
      label: 'Distance from Earth',
      value: n(p.distanceLy.value, 1),
      unit: 'light-years',
      source: p.distanceLy.source,
    },
    {
      label: 'Size (radius)',
      value: n(p.radiusEarth.value),
      unit: '× Earth',
      source: p.radiusEarth.source,
    },
    { label: 'Mass', value: n(p.massEarth.value), unit: '× Earth', source: p.massEarth.source },
    {
      label: 'Surface gravity',
      value: n(p.surfaceGravityG.value),
      unit: 'g',
      source: p.surfaceGravityG.source,
      note: 'Computed: mass ÷ radius²',
    },
    {
      label: 'Escape velocity',
      value: n(p.escapeVelocityKms.value, 1),
      unit: 'km/s',
      source: p.escapeVelocityKms.source,
      note: 'Computed: 11.19 × √(mass ÷ radius)',
    },
    {
      label: 'Equilibrium temperature',
      value: `${Math.round(p.eqTempK.value)} K (${Math.round(kelvinToCelsius(p.eqTempK.value))} °C)`,
      source: p.eqTempK.source,
    },
    {
      label: 'Atmosphere',
      value: ATMOSPHERE_INFO[p.atmosphere.value].label,
      source: p.atmosphere.source,
      note: 'Estimated from size, gravity and temperature. The archive has no atmosphere data for most planets.',
    },
    {
      label: 'Host star',
      value: `${p.host}${p.starSpectralType.value ? ` (${p.starSpectralType.value})` : ''}`,
      source: 'nasa',
    },
    ...(p.starTeffK.value
      ? [
          {
            label: 'Star temperature',
            value: n(p.starTeffK.value, 0),
            unit: 'K',
            source: 'nasa' as const,
          },
        ]
      : []),
    ...(p.orbitalPeriodDays.value
      ? [
          {
            label: 'Orbital period',
            value: n(p.orbitalPeriodDays.value, 2),
            unit: 'days',
            source: p.orbitalPeriodDays.source,
          },
        ]
      : []),
    {
      label: 'Discovered',
      value: `${p.discoveryYear.value} · ${p.discoveryMethod.value}`,
      source: 'nasa',
    },
  ];
}

export const LEG_LABELS: Record<string, string> = {
  earthLaunch: 'Earth launch',
  transitOut: 'Transit out',
  landing: 'Landing',
  ascent: 'Ascent',
  transitBack: 'Transit back',
  earthReturn: 'Earth return',
};

export function requirementRows(p: Planet, d: Difficulty): InfoRow[] {
  const req = missionRequirements(p, d);
  const rows: InfoRow[] = [
    {
      label: 'Round-trip Δv',
      value: n(req.deltaVKms),
      unit: 'km/s',
      source: 'model',
      note: req.legs.map((l) => `${LEG_LABELS[l.leg]} ${n(l.deltaVKms)}`).join(' · '),
    },
    {
      label: 'Lift-off thrust-to-weight (Earth)',
      value: `≥ ${req.minLiftoffTWR}`,
      source: 'model',
    },
    {
      label: `Ascent thrust-to-weight (${n(p.surfaceGravityG.value)} g)`,
      value: `≥ ${req.minAscentTWR}`,
      source: 'model',
    },
    {
      label: 'Communication range',
      value: `Tier ${req.commsTier}`,
      source: 'model',
      note: 'Tier 1 < 15 ly · Tier 2 < 60 ly · Tier 3 beyond',
    },
  ];
  if (req.pressureAtm !== null)
    rows.push({
      label: 'Pressure rating',
      value: `≥ ${req.pressureAtm}`,
      unit: 'atm',
      source: 'model',
    });
  if (req.tempRangeK)
    rows.push({
      label: 'Heat / environment protection',
      value: `must cover ${Math.round(req.tempRangeK[0])} K`,
      source: 'model',
    });
  if (req.lifeSupportDays !== null)
    rows.push({
      label: 'Crew life support (if crewed)',
      value: `≥ ${req.lifeSupportDays}`,
      unit: 'days',
      source: 'model',
    });
  return rows;
}

export function inventorySummary(d: Difficulty): string[] {
  return DIFFICULTY[d].modules.map((m) => `${componentsFor(m).length} × ${m}`);
}

export type DifficultyHint = 'Gentle' | 'Moderate' | 'Tough';

/** Relative difficulty within the pool, based on required Δv and gravity. */
export function difficultyHint(p: Planet, d: Difficulty): DifficultyHint {
  const pool = planetsFor(d)
    .map((x) => ({ id: x.id, dv: missionRequirements(x, d).deltaVKms }))
    .sort((a, b) => a.dv - b.dv);
  const i = pool.findIndex((x) => x.id === p.id);
  const f = pool.length > 1 ? i / (pool.length - 1) : 0;
  return f < 0.34 ? 'Gentle' : f < 0.67 ? 'Moderate' : 'Tough';
}

export function levelNumber(p: Planet, d: Difficulty): number {
  const pool = planetsFor(d)
    .map((x) => ({ id: x.id, dv: missionRequirements(x, d).deltaVKms }))
    .sort((a, b) => a.dv - b.dv);
  return pool.findIndex((x) => x.id === p.id) + 1;
}
