import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CHARACTERS, type DialogueLine } from '../config/characters.ts';
import { useReducedMotion } from '../hooks/useReducedMotion.ts';
import { validateName } from '../services/nameValidation.ts';
import { Avatar } from './Avatar.tsx';

interface Props {
  lines: DialogueLine[];
  initialName: string;
  onDone: (name: string) => void;
}

/** Line-by-line briefing dialogue with Next / Skip and a call-sign prompt at the end. */
export function Dialogue({ lines, initialName, onDone }: Props) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [chars, setChars] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errId = useId();

  const askIndex = lines.findIndex((l) => l.askName);
  const lineIdx = skipped ? askIndex : index;
  const line = lines[lineIdx];
  const speaker = CHARACTERS[line.speaker];
  const full = line.text;
  const typing = !reduced && chars < full.length;

  useEffect(() => {
    if (reduced) return;
    setChars(0);
    const t = window.setInterval(() => {
      setChars((c) => {
        if (c >= full.length) {
          window.clearInterval(t);
          return c;
        }
        return c + 2;
      });
    }, 18);
    return () => window.clearInterval(t);
  }, [full, reduced]);

  useEffect(() => {
    if (line.askName) inputRef.current?.focus();
    else nextRef.current?.focus();
  }, [lineIdx, line.askName]);

  const next = () => {
    if (typing) return setChars(full.length);
    setIndex((i) => Math.min(i + 1, lines.length - 1));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const check = validateName(name);
    if (!check.ok) {
      setError(check.error ?? 'Invalid call-sign');
      return;
    }
    onDone(check.value);
  };

  return (
    <div className="panel mx-auto flex max-w-2xl flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          Mission briefing · {lineIdx + 1} / {lines.length}
        </p>
        {!line.askName && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSkipped(true)}>
            Skip briefing
          </button>
        )}
      </div>
      <div className="flex items-start gap-4">
        <Avatar character={speaker} size={84} />
        <div className="min-w-0 flex-1">
          <div className="font-bold" style={{ color: speaker.color }}>
            {speaker.name}
          </div>
          <div className="text-xs text-muted">{speaker.role}</div>
          <p className="mt-2 min-h-[4.5rem] text-lg leading-relaxed" aria-live="polite">
            <span aria-hidden={typing}>{reduced ? full : full.slice(0, chars)}</span>
            {typing && <span className="sr-only">{full}</span>}
          </p>
        </div>
      </div>
      {line.askName ? (
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 sm:flex-row sm:items-start"
          noValidate
        >
          <div className="flex-1">
            <label htmlFor="callsign" className="text-sm font-semibold">
              Call-sign (shown on the leaderboard)
            </label>
            <input
              id="callsign"
              ref={inputRef}
              value={name}
              maxLength={24}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? errId : undefined}
              className="mt-1 w-full rounded-lg border border-space-600 bg-space-900 px-3 py-2 text-ink"
              placeholder="e.g. Nova-7"
              autoComplete="nickname"
            />
            {error && (
              <p id={errId} className="mt-1 text-sm text-bad" role="alert">
                ✕ {error}
              </p>
            )}
          </div>
          <button type="submit" className="btn btn-primary sm:mt-6">
            Report for duty →
          </button>
        </form>
      ) : (
        <div className="flex justify-end">
          <button ref={nextRef} type="button" className="btn btn-primary" onClick={next}>
            {typing ? 'Show line' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
