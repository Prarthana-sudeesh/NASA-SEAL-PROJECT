// Safe localStorage access. Corrupt or unreadable saved state resets cleanly and leaves a notice.
import type { StateStorage } from 'zustand/middleware';

let notice: string | null = null;

export function takeStorageNotice(): string | null {
  const n = notice;
  notice = null;
  return n;
}

export function setStorageNotice(message: string) {
  notice = message;
}

export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      const raw = localStorage.getItem(name);
      if (raw === null) return null;
      JSON.parse(raw); // validate
      return raw;
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        /* storage blocked */
      }
      notice = 'Your saved progress could not be read, so it was reset. Sorry about that!';
      return null;
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* storage full or blocked: play continues in memory */
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
