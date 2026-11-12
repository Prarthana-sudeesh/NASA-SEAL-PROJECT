// Game state: current screen, player, run (10 attempts), selected planet and the rocket build.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ATTEMPTS_PER_RUN, DIFFICULTY } from '../config/difficulty.ts';
import { getPlanet } from '../data/planets.ts';
import type { Attempt, Difficulty, RocketBuild, Run } from '../data/types.ts';
import { DIFFICULTIES } from '../data/types.ts';
import { emptyBuild, launchBlocks, sanitizeBuild } from '../engine/build.ts';
import { runAttempt } from '../engine/attempt.ts';
import { safeStorage, setStorageNotice, uid } from './persistence.ts';

export type Screen =
  | 'briefing'
  | 'difficulty'
  | 'planets'
  | 'brief'
  | 'builder'
  | 'prelaunch'
  | 'launch'
  | 'outcome'
  | 'summary'
  | 'leaderboard'
  | 'credits';

export interface GameState {
  screen: Screen;
  /** Screen to return to from leaderboard/credits. */
  returnTo: Screen | null;
  playerName: string;
  seenBriefing: boolean;
  launchesWatched: number;
  run: Run | null;
  planetId: string | null;
  build: RocketBuild;

  go: (screen: Screen) => void;
  openAside: (screen: 'leaderboard' | 'credits') => void;
  closeAside: () => void;
  setPlayerName: (name: string) => void;
  finishBriefing: () => void;
  startRun: (difficulty: Difficulty) => void;
  selectPlanet: (planetId: string) => void;
  setBuild: (build: RocketBuild) => void;
  resetBuild: () => void;
  /** Runs the mission engine, records the attempt and moves to the launch sequence. */
  launch: () => Attempt | null;
  markLaunchWatched: () => void;
  nextAttempt: () => void;
  markSubmitted: (entryId: string) => void;
  abandonRun: () => void;
}

const PERSIST_KEY = 'rocket-builder:game';

const initial = {
  screen: 'briefing' as Screen,
  returnTo: null,
  playerName: '',
  seenBriefing: false,
  launchesWatched: 0,
  run: null,
  planetId: null,
  build: emptyBuild(),
};

export const currentAttempt = (run: Run | null): Attempt | undefined => run?.attempts.at(-1);

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,
      go: (screen) => set({ screen }),
      openAside: (screen) =>
        set((s) => ({
          returnTo: s.screen === 'leaderboard' || s.screen === 'credits' ? s.returnTo : s.screen,
          screen,
        })),
      closeAside: () => set((s) => ({ screen: s.returnTo ?? 'difficulty', returnTo: null })),
      setPlayerName: (playerName) => set({ playerName }),
      finishBriefing: () => set({ seenBriefing: true, screen: 'difficulty' }),
      startRun: (difficulty) =>
        set((s) => ({
          run: {
            id: uid(),
            difficulty,
            playerName: s.playerName,
            attempts: [],
            startedAt: new Date().toISOString(),
            submittedEntryId: null,
          },
          planetId: null,
          build: sanitizeBuild(s.build, difficulty),
          screen: 'planets',
        })),
      selectPlanet: (planetId) => set({ planetId, screen: 'brief' }),
      setBuild: (build) => set({ build }),
      resetBuild: () => set({ build: emptyBuild() }),
      launch: () => {
        const { run, planetId, build } = get();
        const planet = getPlanet(planetId);
        if (!run || !planet || run.attempts.length >= ATTEMPTS_PER_RUN) return null;
        if (launchBlocks(build, run.difficulty).length > 0) return null;
        const attempt = runAttempt(build, planet, run.difficulty, run.attempts.length + 1);
        set({ run: { ...run, attempts: [...run.attempts, attempt] }, screen: 'launch' });
        return attempt;
      },
      markLaunchWatched: () => set((s) => ({ launchesWatched: s.launchesWatched + 1 })),
      nextAttempt: () => {
        const { run } = get();
        if (!run) return set({ screen: 'difficulty' });
        set({ screen: run.attempts.length >= ATTEMPTS_PER_RUN ? 'summary' : 'planets' });
      },
      markSubmitted: (entryId) =>
        set((s) => (s.run ? { run: { ...s.run, submittedEntryId: entryId } } : {})),
      abandonRun: () => set({ run: null, planetId: null, screen: 'difficulty' }),
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        screen: s.screen,
        returnTo: s.returnTo,
        playerName: s.playerName,
        seenBriefing: s.seenBriefing,
        launchesWatched: s.launchesWatched,
        run: s.run,
        planetId: s.planetId,
        build: s.build,
      }),
      merge: (persisted, current) => {
        if (!persisted) return current;
        if (!isValidPersisted(persisted)) {
          setStorageNotice('Your saved progress looked damaged, so a fresh game was started.');
          return current;
        }
        const p = persisted as Partial<GameState>;
        // A refresh mid-launch resumes on the outcome screen (the attempt is already recorded).
        const screen = p.screen === 'launch' ? 'outcome' : p.screen;
        return { ...current, ...p, screen: screen ?? current.screen };
      },
    },
  ),
);

function isValidPersisted(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false;
  const s = p as Partial<GameState>;
  if (typeof s.playerName !== 'string') return false;
  const b = s.build;
  if (!b || !Array.isArray(b.fuel) || b.fuel.length !== 3 || !Array.isArray(b.thrusters))
    return false;
  if (typeof b.crew !== 'number') return false;
  if (s.run) {
    if (!DIFFICULTIES.includes(s.run.difficulty) || !Array.isArray(s.run.attempts)) return false;
    if (s.run.attempts.length > ATTEMPTS_PER_RUN) return false;
    if (s.run.attempts.some((a) => typeof a?.score?.total !== 'number' || !a.result)) return false;
  }
  return true;
}

/** Testing helper. */
export function resetGameStore() {
  useGame.setState({ ...initial, build: emptyBuild() });
}

export function runBudget(run: Run | null): number {
  return run ? DIFFICULTY[run.difficulty].budget : 0;
}
