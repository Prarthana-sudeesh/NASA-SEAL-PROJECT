import { useEffect, useRef, useState } from 'react';
import { LiveRegion } from '../components/LiveRegion.tsx';
import { DATA_RETRIEVED_AT, SNAPSHOT_ERRORS } from '../data/planets.ts';
import { Build } from '../game/screens/Build.tsx';
import { Launch } from '../game/screens/Launch.tsx';
import { Leaderboard } from '../game/screens/Leaderboard.tsx';
import { Login } from '../game/screens/Login.tsx';
import { Mission } from '../game/screens/Mission.tsx';
import { Result } from '../game/screens/Result.tsx';
import { Summary } from '../game/screens/Summary.tsx';
import { takeStorageNotice } from '../store/persistence.ts';
import { useGame, type Screen } from '../store/gameStore.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { useSettings } from '../store/settingsStore.ts';
import { setSoundEnabled, sfx, unlockAudio } from '../game/sound.ts';

/** Global sound wiring: unlock on first gesture, button clicks/hovers, screen swooshes. */
function useGameSounds(screen: Screen) {
  const sound = useSettings((s) => s.sound);
  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => {
    const unlock = () => unlockAudio();
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.('button, [role="button"], a');
      if (!btn || btn.hasAttribute('disabled') || (btn as HTMLElement).dataset.sfx === 'none')
        return;
      sfx(btn.classList.contains('big-btn') ? 'confirm' : 'click');
    };
    const onOver = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.('.big-btn, .tool-btn');
      if (btn && !btn.contains(e.relatedTarget as Node | null)) sfx('hover', 60);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onOver);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mouseover', onOver);
    };
  }, []);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    sfx('whoosh');
  }, [screen]);
}

const SCREENS: Record<Screen, () => React.JSX.Element | null> = {
  login: Login,
  mission: Mission,
  build: Build,
  launch: Launch,
  result: Result,
  summary: Summary,
  leaderboard: Leaderboard,
};

const TITLES: Record<Screen, string> = {
  login: 'Crew login',
  mission: 'Mission control',
  build: 'Rocket blueprint',
  launch: 'Launch',
  result: 'Mission report',
  summary: 'Campaign summary',
  leaderboard: 'Leaderboard',
};

export function App() {
  const screen = useGame((s) => s.screen);
  const player = useGame((s) => s.player);
  const [notice, setNotice] = useState<string | null>(() => takeStorageNotice());
  const current: Screen = player ? screen : 'login';
  useGameSounds(current);

  useEffect(() => {
    document.title = `${TITLES[current]} · Rocket Builder`;
  }, [current]);
  useEffect(() => {
    const n = takeStorageNotice();
    if (n) setNotice(n);
  }, []);

  const Current = SCREENS[current] ?? Mission;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-[max(8px,1vw)]">
      {notice && (
        <div
          role="alert"
          className="flex w-full max-w-5xl items-center justify-between gap-3 rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm text-warn"
        >
          <span>! {notice}</span>
          <button type="button" className="underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}
      {SNAPSHOT_ERRORS.length > 0 && (
        <div
          role="alert"
          className="w-full max-w-5xl rounded-lg border border-bad/50 bg-bad/10 px-4 py-2 text-sm text-bad"
        >
          ✕ Planet data failed validation ({SNAPSHOT_ERRORS[0]}).
        </div>
      )}
      <p className="rotate-hint text-center text-xs text-muted">
        Tip: turn your phone sideways for the best view.
      </p>
      <main className="w-full" aria-label={TITLES[current]}>
        <h1 className="sr-only">Rocket Builder: {TITLES[current]}</h1>
        <ErrorBoundary key={current}>
          <Current />
        </ErrorBoundary>
      </main>
      <footer className="text-center text-[11px] text-muted">
        Planet data: NASA Exoplanet Archive, retrieved {DATA_RETRIEVED_AT}. Team SEAL · NASA Space
        Apps Challenge entry, not endorsed by NASA. Real exoplanets are far beyond today’s
        spacecraft; travel physics here are simplified so missions are playable.
      </footer>
      <LiveRegion />
    </div>
  );
}
