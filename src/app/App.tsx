import { useEffect, useRef, useState } from 'react';
import { ATTEMPTS_PER_RUN, DIFFICULTY } from '../config/difficulty.ts';
import { LiveRegion } from '../components/LiveRegion.tsx';
import { DATA_RETRIEVED_AT, DATA_SOURCE, SNAPSHOT_ERRORS } from '../data/planets.ts';
import { averageScore } from '../engine/scoring.ts';
import { Briefing } from '../screens/Briefing.tsx';
import { Builder } from '../screens/Builder.tsx';
import { Credits } from '../screens/Credits.tsx';
import { Difficulty } from '../screens/Difficulty.tsx';
import { Launch } from '../screens/Launch.tsx';
import { Leaderboard } from '../screens/Leaderboard.tsx';
import { Outcome } from '../screens/Outcome.tsx';
import { PlanetBrief } from '../screens/PlanetBrief.tsx';
import { PlanetSelect } from '../screens/PlanetSelect.tsx';
import { PreLaunch } from '../screens/PreLaunch.tsx';
import { RunSummary } from '../screens/RunSummary.tsx';
import { takeStorageNotice } from '../store/persistence.ts';
import { useGame, type Screen } from '../store/gameStore.ts';
import { useSettings } from '../store/settingsStore.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';

const SCREENS: Record<Screen, () => React.JSX.Element> = {
  briefing: Briefing,
  difficulty: Difficulty,
  planets: PlanetSelect,
  brief: PlanetBrief,
  builder: Builder,
  prelaunch: PreLaunch,
  launch: Launch,
  outcome: Outcome,
  summary: RunSummary,
  leaderboard: Leaderboard,
  credits: Credits,
};

const TITLES: Record<Screen, string> = {
  briefing: 'Mission briefing',
  difficulty: 'Choose difficulty',
  planets: 'Select destination',
  brief: 'Mission brief',
  builder: 'Rocket construction',
  prelaunch: 'Launch preparation',
  launch: 'Launch',
  outcome: 'Mission outcome',
  summary: 'Campaign summary',
  leaderboard: 'Leaderboards',
  credits: 'Credits',
};

function Header() {
  const { run, screen, playerName, openAside, go } = useGame();
  const { sound, toggleSound, motion, setMotion } = useSettings();
  const inLaunch = screen === 'launch';
  return (
    <header className="sticky top-0 z-30 border-b border-space-700 bg-space-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <button
          type="button"
          className="flex items-center gap-2 font-black tracking-tight"
          onClick={() => !inLaunch && go(run ? 'planets' : 'difficulty')}
          disabled={inLaunch || screen === 'briefing'}
          aria-label="Rocket Builder home"
        >
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span className="text-lg">
            Rocket <span className="text-accent">Builder</span>
          </span>
        </button>
        {run && (
          <div
            className="flex items-center gap-2 text-xs text-muted"
            aria-label="Campaign progress"
          >
            <span className="rounded-full border border-space-600 px-2 py-0.5 font-semibold text-ink">
              {DIFFICULTY[run.difficulty].label}
            </span>
            <span className="tabular-nums">
              Mission{' '}
              {Math.min(
                run.attempts.length + (screen === 'outcome' || screen === 'launch' ? 0 : 1),
                ATTEMPTS_PER_RUN,
              )}
              /{ATTEMPTS_PER_RUN}
            </span>
            {run.attempts.length > 0 && (
              <span className="tabular-nums">
                Avg {averageScore(run.attempts.map((a) => a.score.total))}
              </span>
            )}
          </div>
        )}
        <nav className="ml-auto flex items-center gap-1" aria-label="Game menu">
          {playerName && (
            <span className="hidden text-xs text-muted sm:inline">👩‍🚀 {playerName}</span>
          )}
          {run && run.attempts.length > 0 && !inLaunch && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('summary')}>
              Campaign
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => openAside('leaderboard')}
            disabled={inLaunch}
          >
            🏆 <span className="hidden sm:inline">Leaderboard</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? 'Mute sound' : 'Turn sound on'}
            title={sound ? 'Mute sound' : 'Turn sound on'}
          >
            {sound ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMotion(motion === 'reduced' ? 'full' : 'reduced')}
            aria-pressed={motion === 'reduced'}
            title="Reduce motion"
          >
            <span aria-hidden="true">{motion === 'reduced' ? '⏸' : '▶'}</span>
            <span className="hidden md:inline">
              {motion === 'reduced' ? 'Motion off' : 'Motion on'}
            </span>
            <span className="sr-only md:hidden">Reduce motion</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const openAside = useGame((s) => s.openAside);
  return (
    <footer className="mt-10 border-t border-space-700 px-4 py-4 text-center text-xs text-muted">
      <p>
        Data: {DATA_SOURCE}, retrieved {DATA_RETRIEVED_AT}. Team SEAL, NASA Space Apps Challenge
        entry; not endorsed by NASA.{' '}
        <button
          type="button"
          className="underline hover:text-ink"
          onClick={() => openAside('credits')}
        >
          Credits
        </button>
      </p>
    </footer>
  );
}

export function App() {
  const screen = useGame((s) => s.screen);
  const mainRef = useRef<HTMLElement>(null);
  const [notice, setNotice] = useState<string | null>(() => takeStorageNotice());

  // Move focus to the new screen for keyboard and screen-reader users.
  useEffect(() => {
    document.title = `${TITLES[screen]} · Rocket Builder`;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    const n = takeStorageNotice();
    if (n) setNotice(n);
  }, []);

  const Current = SCREENS[screen] ?? Difficulty;
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-space-950"
      >
        Skip to content
      </a>
      <Header />
      {notice && (
        <div
          role="alert"
          className="mx-auto mt-3 flex max-w-7xl items-center justify-between gap-3 rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm text-warn"
        >
          <span>! {notice}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}
      {SNAPSHOT_ERRORS.length > 0 && (
        <div
          role="alert"
          className="mx-auto mt-3 max-w-7xl rounded-lg border border-bad/50 bg-bad/10 px-4 py-2 text-sm text-bad"
        >
          ✕ The bundled planet data failed validation ({SNAPSHOT_ERRORS[0]}). Run{' '}
          <code>npm run fetch-planets</code>.
        </div>
      )}
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 outline-none"
      >
        <ErrorBoundary key={screen}>
          <Current />
        </ErrorBoundary>
      </main>
      <Footer />
      <LiveRegion />
    </div>
  );
}
