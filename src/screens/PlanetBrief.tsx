import { componentsFor, MODULE_LABELS } from '../config/components.ts';
import { DIFFICULTY } from '../config/difficulty.ts';
import { ATMOSPHERE_INFO } from '../config/physics.ts';
import { Badge } from '../components/Badge.tsx';
import { planetStatRows, requirementRows, type InfoRow } from '../components/planetInfo.ts';
import { PlanetVisual } from '../components/PlanetVisual.tsx';
import { ScienceNote } from '../components/ScienceNote.tsx';
import { getPlanet } from '../data/planets.ts';
import { useGame } from '../store/gameStore.ts';
import { ScreenMissing } from './ScreenMissing.tsx';

function Rows({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="flex flex-col divide-y divide-space-700">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-1.5"
        >
          <dt className="text-sm text-muted">{r.label}</dt>
          <dd className="flex items-center gap-2 text-right font-semibold tabular-nums">
            <span>
              {r.value}
              {r.unit && <span className="ml-1 font-normal text-muted">{r.unit}</span>}
            </span>
            <Badge source={r.source} />
          </dd>
          {r.note && <dd className="w-full text-[0.7rem] text-muted">{r.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function PlanetBrief() {
  const { run, planetId, go } = useGame();
  const planet = getPlanet(planetId);
  if (!run || !planet) return <ScreenMissing what="a selected planet" />;
  const cfg = DIFFICULTY[run.difficulty];
  const atmo = ATMOSPHERE_INFO[planet.atmosphere.value];
  return (
    <div className="flex flex-col gap-4">
      <header className="panel flex flex-col items-center gap-4 p-4 sm:flex-row">
        <PlanetVisual planet={planet} size={140} />
        <div className="flex-1">
          <p className="eyebrow">Stage 4 · Planet information &amp; mission brief</p>
          <h1 className="text-3xl font-bold">{planet.name}</h1>
          <p className="mt-1 leading-relaxed">{planet.description}</p>
          <p className="mt-2 text-sm text-muted">
            Atmosphere ({atmo.label}): {atmo.summary} <Badge source="model" />
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Badge source="nasa" /> real value from the NASA Exoplanet Archive
        </span>
        <span className="flex items-center gap-1">
          <Badge source="model" /> simplified gameplay assumption or computed value
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4" aria-labelledby="stats-h">
          <h2 id="stats-h" className="mb-2 text-xl font-bold">
            Planet characteristics
          </h2>
          <Rows rows={planetStatRows(planet)} />
        </section>
        <div className="flex flex-col gap-4">
          <section className="panel p-4" aria-labelledby="req-h">
            <h2 id="req-h" className="mb-2 text-xl font-bold">
              Mission requirements
            </h2>
            <Rows rows={requirementRows(planet, run.difficulty)} />
          </section>
          <section className="panel p-4" aria-labelledby="res-h">
            <h2 id="res-h" className="mb-2 text-xl font-bold">
              Resources provided
            </h2>
            <p>
              Budget:{' '}
              <strong className="text-accent-soft">{cfg.budget.toLocaleString()} credits</strong>{' '}
              <Badge source="model" />
            </p>
            <p className="text-xs text-muted">
              Overspending up to 15% is allowed but costs points. Beyond that, launch is blocked.
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {cfg.modules.map((m) => (
                <li key={m}>
                  <strong>{MODULE_LABELS[m]}</strong>
                  <span className="text-muted">
                    :{' '}
                    {componentsFor(m)
                      .map((c) => c.name)
                      .join(' · ')}
                  </span>
                </li>
              ))}
              <li>
                <strong>Crew</strong>
                <span className="text-muted">: 0–{cfg.maxCrew} astronauts</span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <ScienceNote />

      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => go('planets')}>
          ← Choose another planet
        </button>
        <button type="button" className="btn btn-primary" onClick={() => go('builder')}>
          Start building →
        </button>
      </div>
    </div>
  );
}
