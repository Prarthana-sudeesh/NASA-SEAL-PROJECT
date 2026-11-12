// Game state: signed-in player, campaign (10 launches), current planet, build and dials.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getPlanet } from '../data/planets.ts';
import { ATTEMPTS_PER_RUN, DIFFICULTIES, type Difficulty } from '../game/config.ts';
import {
  DEFAULT_DIALS,
  EMPTY_BUILD,
  launchBlocks,
  simulate,
  type Build,
  type Dials,
  type Result,
} from '../game/engine.ts';
import { safeStorage, setStorageNotice, uid } from './persistence.ts';

export type Screen =
  'login' | 'mission' | 'build' | 'launch' | 'result' | 'summary' | 'leaderboard';

export interface Player {
  username: string;
  email: string;
}

export interface Attempt {
  n: number;
  planetId: string;
  build: Build;
  dials: Dials;
  result: Result;
  at: string;
}

export interface Run {
  id: string;
  difficulty: Difficulty;
  attempts: Attempt[];
  startedAt: string;
  submittedEntryId: string | null;
}

export type BuildStep = 'parts' | 'dials';

export interface GameState {
  screen: Screen;
  player: Player | null;
  briefed: boolean;
  difficulty: Difficulty;
  run: Run | null;
  planetId: string | null;
  build: Build;
  dials: Dials;
  step: BuildStep;
  launchesWatched: number;

  go: (s: Screen) => void;
  signIn: (p: Player) => void;
  signOut: () => void;
  setBriefed: () => void;
  chooseDifficulty: (d: Difficulty) => void;
  choosePlanet: (id: string) => void;
  setBuild: (b: Build) => void;
  setDials: (d: Partial<Dials>) => void;
  setStep: (s: BuildStep) => void;
  launch: () => Attempt | null;
  markWatched: () => void;
  next: () => void;
  newCampaign: () => void;
  markSubmitted: (id: string) => void;
}

const newRun = (difficulty: Difficulty): Run => ({
  id: uid(),
  difficulty,
  attempts: [],
  startedAt: new Date().toISOString(),
  submittedEntryId: null,
});

const initial = {
  screen: 'login' as Screen,
  player: null,
  briefed: false,
  difficulty: 'easy' as Difficulty,
  run: null,
  planetId: DIFFICULTIES.easy.planets[0],
  build: EMPTY_BUILD,
  dials: DEFAULT_DIALS,
  step: 'parts' as BuildStep,
  launchesWatched: 0,
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,
      go: (screen) => set({ screen }),
      signIn: (player) => set({ player, screen: 'mission' }),
      signOut: () => set({ ...initial }),
      setBriefed: () => set({ briefed: true }),
      chooseDifficulty: (difficulty) => {
        const { run } = get();
        set({
          difficulty,
          planetId: DIFFICULTIES[difficulty].planets[0],
          run:
            run && run.difficulty === difficulty && run.attempts.length < ATTEMPTS_PER_RUN
              ? run
              : null,
          build: {
            ...get().build,
            crew: Math.min(get().build.crew, DIFFICULTIES[difficulty].maxCrew),
          },
        });
      },
      choosePlanet: (planetId) => set({ planetId }),
      setBuild: (build) => set({ build }),
      setDials: (d) => set((s) => ({ dials: { ...s.dials, ...d } })),
      setStep: (step) => set({ step }),
      launch: () => {
        const { planetId, build, dials, difficulty } = get();
        const planet = getPlanet(planetId);
        if (!planet || launchBlocks(build, difficulty).length) return null;
        let run = get().run;
        if (!run || run.difficulty !== difficulty || run.attempts.length >= ATTEMPTS_PER_RUN)
          run = newRun(difficulty);
        const attempt: Attempt = {
          n: run.attempts.length + 1,
          planetId: planet.id,
          build,
          dials,
          result: simulate(build, dials, planet, difficulty),
          at: new Date().toISOString(),
        };
        set({ run: { ...run, attempts: [...run.attempts, attempt] }, screen: 'launch' });
        return attempt;
      },
      markWatched: () => set((s) => ({ launchesWatched: s.launchesWatched + 1 })),
      next: () => {
        const run = get().run;
        set({
          screen: run && run.attempts.length >= ATTEMPTS_PER_RUN ? 'summary' : 'mission',
          step: 'parts',
        });
      },
      newCampaign: () =>
        set((s) => ({ run: newRun(s.difficulty), screen: 'mission', step: 'parts' })),
      markSubmitted: (id) => set((s) => (s.run ? { run: { ...s.run, submittedEntryId: id } } : {})),
    }),
    {
      name: 'rocket-builder:v2',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        screen: s.screen,
        player: s.player,
        briefed: s.briefed,
        difficulty: s.difficulty,
        run: s.run,
        planetId: s.planetId,
        build: s.build,
        dials: s.dials,
        step: s.step,
        launchesWatched: s.launchesWatched,
      }),
      merge: (persisted, current) => {
        if (!persisted) return current;
        if (!isValid(persisted)) {
          setStorageNotice('Your saved progress looked damaged, so a fresh game was started.');
          return current;
        }
        const p = persisted as Partial<GameState>;
        const screen = p.screen === 'launch' ? 'result' : p.screen;
        return { ...current, ...p, screen: p.player ? (screen ?? 'mission') : 'login' };
      },
    },
  ),
);

function isValid(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false;
  const s = p as Partial<GameState>;
  if (s.player && (typeof s.player.username !== 'string' || typeof s.player.email !== 'string'))
    return false;
  if (!s.build || typeof s.build.crew !== 'number') return false;
  if (!s.dials || typeof s.dials.fuel !== 'number') return false;
  if (s.difficulty && !(s.difficulty in DIFFICULTIES)) return false;
  if (
    s.run &&
    (!Array.isArray(s.run.attempts) ||
      s.run.attempts.some((a) => typeof a?.result?.total !== 'number'))
  )
    return false;
  return true;
}

export const currentAttempt = (run: Run | null) => run?.attempts.at(-1);

/** Testing helper. */
export function resetGameStore() {
  useGame.setState({ ...initial });
}
