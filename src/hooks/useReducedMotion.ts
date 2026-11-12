import { useEffect, useState } from 'react';
import { useSettings } from '../store/settingsStore.ts';

function systemPrefersReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/** True when motion should be replaced with fades/static progression (system setting or user override). */
export function useReducedMotion(): boolean {
  const pref = useSettings((s) => s.motion);
  const [system, setSystem] = useState(systemPrefersReduced);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setSystem(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return system;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return matches;
}
