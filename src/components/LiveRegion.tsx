import { useEffect, useState } from 'react';

type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

/** Announce a message to screen readers via the global polite live region. */
export function announce(message: string) {
  listeners.forEach((l) => l(message));
}

export function LiveRegion() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const l: Listener = (m) => {
      // Clear first so repeated identical messages are re-announced.
      setMsg('');
      window.setTimeout(() => setMsg(m), 30);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
      {msg}
    </div>
  );
}
