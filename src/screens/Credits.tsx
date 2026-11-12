import { DATA_RETRIEVED_AT, PLANETS } from '../data/planets.ts';
import { ScienceNote } from '../components/ScienceNote.tsx';
import { useGame } from '../store/gameStore.ts';

export function Credits() {
  const closeAside = useGame((s) => s.closeAside);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex items-end justify-between gap-2">
        <div>
          <p className="eyebrow">About</p>
          <h1 className="text-3xl font-bold">Credits</h1>
        </div>
        <button type="button" className="btn btn-ghost" onClick={closeAside}>
          ← Back
        </button>
      </header>
      <section className="panel p-4">
        <h2 className="text-xl font-bold">Rocket Builder by Team SEAL</h2>
        <p className="mt-1 text-muted">
          An educational rocket-design game created for the NASA Space Apps Challenge. This game is
          a NASA Space Apps Challenge entry and is not endorsed by NASA.
        </p>
      </section>
      <section className="panel p-4">
        <h2 className="text-xl font-bold">Data</h2>
        <p className="mt-1">
          Planet data: NASA Exoplanet Archive (Planetary Systems Composite Parameters table,{' '}
          <code>pscomppars</code>), retrieved {DATA_RETRIEVED_AT}. {PLANETS.length} planets are
          bundled so the game works offline.
        </p>
        <ul className="mt-2 ml-5 list-disc text-sm text-muted">
          <li>
            NASA Exoplanet Archive:{' '}
            <a
              className="text-nasa underline"
              href="https://exoplanetarchive.ipac.caltech.edu/"
              target="_blank"
              rel="noreferrer"
            >
              exoplanetarchive.ipac.caltech.edu
            </a>
          </li>
          <li>
            NASA Science, Strange New Worlds (tone and inspiration):{' '}
            <a
              className="text-nasa underline"
              href="https://science.nasa.gov/exoplanets/immersive/strange-new-worlds/"
              target="_blank"
              rel="noreferrer"
            >
              science.nasa.gov
            </a>
          </li>
          <li>Planet descriptions are original text written by the team.</li>
          <li>
            Surface gravity, escape velocity, atmosphere class and all mission physics are labelled
            GAME MODEL.
          </li>
        </ul>
      </section>
      <ScienceNote />
      <section className="panel p-4 text-sm text-muted">
        <h2 className="text-xl font-bold text-ink">Built with</h2>
        <p className="mt-1">
          React, Vite, TypeScript, Tailwind CSS, Recharts, dnd-kit, Framer Motion and Zustand.
        </p>
        <p className="mt-1">
          Mission-control characters are fictional. The NASA name is used only to credit data
          sources.
        </p>
      </section>
    </div>
  );
}
