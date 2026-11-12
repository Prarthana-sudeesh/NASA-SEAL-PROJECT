import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from './persistence.ts';

export type MotionPref = 'system' | 'reduced' | 'full';

interface SettingsState {
  sound: boolean;
  motion: MotionPref;
  /** Leaderboard entries submitted from this browser (highlighted as "you"). */
  myEntryIds: string[];
  toggleSound: () => void;
  setMotion: (m: MotionPref) => void;
  addMyEntry: (id: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sound: false,
      motion: 'system',
      myEntryIds: [],
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      setMotion: (motion) => set({ motion }),
      addMyEntry: (id) => set((s) => ({ myEntryIds: [...s.myEntryIds, id] })),
    }),
    {
      name: 'rocket-builder:settings',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<SettingsState> | undefined;
        if (!p || typeof p !== 'object') return current;
        return {
          ...current,
          sound: typeof p.sound === 'boolean' ? p.sound : current.sound,
          motion: p.motion === 'reduced' || p.motion === 'full' ? p.motion : 'system',
          myEntryIds: Array.isArray(p.myEntryIds)
            ? p.myEntryIds.filter((x) => typeof x === 'string')
            : [],
        };
      },
    },
  ),
);
