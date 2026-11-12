// Installable-app support: service worker registration and the browser's install prompt.
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** True when running as an installed app. */
export function isInstalled(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad Safari has no install prompt; players use Share → Add to Home Screen. */
export function isIosBrowser(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !isInstalled();
}

export function setupPwa() {
  // Service workers only make sense on the game's own page, not inside an embedding frame.
  const topLevel = window.top === window.self;
  if (import.meta.env.PROD && topLevel && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
        /* offline support unavailable here; the game still works online */
      });
    });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** Returns an install function while the browser offers installation, otherwise null. */
export function useInstallPrompt(): (() => Promise<void>) | null {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  if (!deferred) return null;
  return async () => {
    const e = deferred;
    if (!e) return;
    await e.prompt();
    await e.userChoice.catch(() => undefined);
    deferred = null;
    notify();
  };
}
