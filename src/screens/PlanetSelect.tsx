import { useState } from 'react';
import { componentsFor, MODULE_LABELS } from '../config/components.ts';
import { ATTEMPTS_PER_RUN, DIFFICULTY } from '../config/difficulty.ts';
import { Badge } from '../components/Badge.tsx';
import { difficultyHint, levelNumber, planetStatRows } from '../components/planetInfo.ts';
import { PlanetVisual } from '../components/PlanetVisual.tsx';
import { ScienceNote } from '../components/ScienceNote.tsx';
import { planetsFor } from '../data/planets.ts';
import type { Difficulty, Planet } from '../data/types.ts';
import { missionRequirements } from '../engine/requirements.ts';
import { useGame } from '../store/gameStore.ts';
import { ScreenMissing } from './ScreenMissing.tsx';

type Tab = 'level' | 'description' | 'stats' | 'resources';
const TABS: { id: Tab; label: string }[] = [
  { id: 'level', label: 'Level' },
  { id: 'description', label: 'Description' },
  { id: 'stats', label: 'Stats' },
  { id: 'resources', label: 'Resources' },
];

const HINT_STYLE = { Gentle: 'text-ok', Moderate: 'text-warn', Tough: 'text-bad' } as const;
const HINT_ICON = { Gentle: '●', Moderate: '▲', Tough: '◆' } as const;

function PlanetDetails({ planet, difficulty }: { planet: Planet; difficulty: Difficulty }) {
  const [tab, setTab] = useState<Tab>('level');
  const req = missionRequirements(planet, difficulty);
  const hint = difficultyHint(planet, difficulty);
  const cfg = DIFFICULTY[difficulty];
  return (
    <div>
      <div role="tablist" aria-label={`${planet.name} details`} className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${planet.id}-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${planet.id}-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              const i = TABS.findIndex((x) => x.id === tab);
              if (e.key === 'ArrowRight') setTab(TABS[(i + 1) % TABS.length].id);
              if (e.key === 'ArrowLeft') setTab(TABS[(i + TABS.length - 1) % TABS.length].id);
            }}
            className={`rounded-lg px-3 py-1 text-sm ${tab === t.id ? 'bg-accent font-semibold text-space-950' : 'bg-space-800 text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${planet.id}-${tab}`}
        aria-labelledby={`tab-${planet.id}-${tab}`}
        className="mt-2 min-h-[8rem] text-sm"
      >
        {tab === 'level' && (
          <div className="flex flex-col gap-1">
            <p>
              <strong>
                {cfg.label} · Level {levelNumber(planet, difficulty)} of{' '}
                {planetsFor(difficulty).length}
              </strong>
            </p>
            <p className={HINT_STYLE[hint]}>
              <span aria-hidden="true">{HINT_ICON[hint]} </span>
              {hint} mission for this difficulty
            </p>
            <p className="text-muted">
              Round trip needs about <strong className="text-ink">{req.deltaVKms} km/s</strong> of
              Δv and comms tier {req.commsTier}. <Badge source="model" />
            </p>
          </div>
        )}
        {tab === 'description' && <p className="leading-relaxed">{planet.description}</p>}
        {tab === 'stats' && (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {planetStatRows(planet)
              .slice(0, 6)
              .map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-2 border-b border-space-700 py-0.5"
                >
                  <dt className="text-muted">{r.label}</dt>
                  <dd className="flex items-center gap-1 text-right tabular-nums">
                    {r.value}
                    {r.unit ? ` ${r.unit}` : ''} <Badge source={r.source} />
                  </dd>
                </div>
              ))}
          </dl>
        )}
        {tab === 'resources' && (
          <div className="flex flex-col gap-1">
            <p>
              Budget: <strong>{cfg.budget.toLocaleString()} credits</strong> (up to +15% overspend
              allowed, with a penalty)
            </p>
            <ul className="ml-4 list-disc text-muted">
              {cfg.modules.map((m) => (
                <li key={m}>
                  {MODULE_LABELS[m]}:{' '}
                  {componentsFor(m)
                    .map((c) => c.name)
                    .join(', ')}
                </li>
              ))}
            </ul>
            <p className="text-muted">Crew: 0–{cfg.maxCrew} astronauts</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanetSelect() {
  const { run, planetId, selectPlanet } = useGame();
  const [focused, setFocused] = useState<string | null>(planetId);
  if (!run) return <ScreenMissing what="an active campaign" />;
  const planets = planetsFor(run.difficulty);
  const visited = new Set(run.attempts.map((a) => a.planetId));
  if (planets.length === 0)
    return (
      <div className="panel p-6 text-center" role="alert">
        Planet data could not be loaded. Try refreshing, or run <code>npm run fetch-planets</code>.
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">
            Stage 3 · Mission {run.attempts.length + 1} of {ATTEMPTS_PER_RUN}
          </p>
          <h1 className="text-3xl font-bold">Select your destination</h1>
          <p className="text-muted">You can pick a different planet for every mission.</p>
        </div>
      </header>
      <ScienceNote compact />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {planets.map((p) => {
          const hint = difficultyHint(p, run.difficulty);
          const open = focused === p.id;
          return (
            <li
              key={p.id}
              className={`panel flex flex-col gap-3 p-3 ${open ? 'border-accent' : ''}`}
            >
              <div className="flex items-center gap-3">
                <PlanetVisual planet={p} size={84} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold">{p.name}</h2>
                  <p className="text-xs text-muted">Host star: {p.host}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm tabular-nums">
                    {p.distanceLy.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ly{' '}
                    <Badge source={p.distanceLy.source} />
                  </p>
                  <p className={`text-xs font-semibold ${HINT_STYLE[hint]}`}>
                    <span aria-hidden="true">{HINT_ICON[hint]} </span>
                    {hint}
                    {visited.has(p.id) && <span className="ml-2 text-muted">✓ visited</span>}
                  </p>
                </div>
              </div>
              {open ? (
                <PlanetDetails planet={p} difficulty={run.difficulty} />
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm self-start"
                  onClick={() => setFocused(p.id)}
                >
                  Level · Description · Stats · Resources
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary mt-auto"
                onClick={() => selectPlanet(p.id)}
              >
                Choose {p.name} →
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
