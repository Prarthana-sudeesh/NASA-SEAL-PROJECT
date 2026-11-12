import { getComponent } from '../config/components.ts';
import { DIFFICULTY } from '../config/difficulty.ts';
import { SCORING } from '../config/scoring.ts';
import type { Difficulty, PayloadComponent, RocketBuild } from '../data/types.ts';

interface Props {
  build: RocketBuild;
  difficulty: Difficulty;
  onChange: (crew: number) => void;
}

export function AstronautIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="6" fill="#eef2fb" />
      <rect x="8" y="5.5" width="8" height="5" rx="2.5" fill="#1a2a52" />
      <path d="M5 23c0-6 3-9 7-9s7 3 7 9z" fill="#eef2fb" />
      <rect x="10" y="16" width="4" height="3" rx="1" fill="#ff7a1a" />
    </svg>
  );
}

export function CrewSelector({ build, difficulty, onChange }: Props) {
  const max = DIFFICULTY[difficulty].maxCrew;
  const payload = getComponent(build.payload) as PayloadComponent | undefined;
  const seats = payload?.maxCrew ?? 0;
  return (
    <fieldset className="panel p-3">
      <legend className="sr-only">Crew</legend>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">Astronauts</div>
          <div className="text-[0.7rem] text-muted">
            0–{max} on this difficulty ·{' '}
            {payload ? `${payload.name} seats ${seats}` : 'needs a crew payload'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange(Math.max(0, build.crew - 1))}
            disabled={build.crew === 0}
            aria-label="Remove one astronaut"
          >
            −
          </button>
          <output
            aria-live="polite"
            aria-label="Crew on board"
            className="w-6 text-center text-lg font-bold tabular-nums"
          >
            {build.crew}
          </output>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange(Math.min(max, build.crew + 1))}
            disabled={build.crew >= max}
            aria-label="Add one astronaut"
          >
            +
          </button>
        </div>
      </div>
      <div className="mt-2 flex min-h-6 gap-0.5" aria-hidden="true">
        {Array.from({ length: build.crew }, (_, i) => (
          <AstronautIcon key={i} className={`h-6 w-6 ${i >= seats ? 'opacity-40' : ''}`} />
        ))}
      </div>
      {build.crew > seats && (
        <p className="mt-1 text-xs text-bad" role="alert">
          ✕{' '}
          {payload
            ? `${payload.name} only seats ${seats}.`
            : 'Astronauts need a Crew Capsule or Habitat Module.'}
        </p>
      )}
      <p className="mt-1 text-[0.7rem] text-muted">
        Each astronaut adds 0.5 t. Success: score × (1 + {SCORING.crew.successBonusPerAstronaut} per
        astronaut). Failure: −{SCORING.crew.failurePenaltyPerAstronaut} points each.
      </p>
    </fieldset>
  );
}
