import type { MissionStage } from '../data/types.ts';
import { MISSION_STAGES } from '../data/types.ts';

export const STAGE_LABELS: Record<MissionStage, string> = {
  launch: 'Launch',
  orbit: 'Earth orbit',
  transit: 'Transit',
  approach: 'Destination approach',
  landing: 'Landing',
  surface: 'Surface operations',
  ascent: 'Ascent',
  return: 'Return journey',
  reentry: 'Earth re-entry',
};

interface Props {
  current: MissionStage | null;
  failedAt?: MissionStage | null;
  done?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

/** Mission status tracker: Launch → … → Earth re-entry, current stage highlighted. */
export function ProgressTracker({
  current,
  failedAt = null,
  done = false,
  orientation = 'vertical',
}: Props) {
  const idx = current ? MISSION_STAGES.indexOf(current) : -1;
  return (
    <ol
      aria-label="Mission status"
      className={orientation === 'vertical' ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1'}
    >
      {MISSION_STAGES.map((stage, i) => {
        const failed = failedAt === stage && (done || i === idx);
        const cleared = i < idx || (done && !failedAt && i <= idx);
        const active = i === idx && !failed && !done;
        const state = failed ? 'failed' : cleared ? 'complete' : active ? 'in progress' : 'pending';
        return (
          <li
            key={stage}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs transition-colors ${
              failed
                ? 'border-bad/60 bg-bad/15 text-bad'
                : active
                  ? 'border-accent bg-accent/15 font-semibold text-ink'
                  : cleared
                    ? 'border-ok/40 text-ok'
                    : 'border-space-700 text-muted'
            }`}
          >
            <span aria-hidden="true" className="w-3 text-center">
              {failed ? '✕' : cleared ? '✓' : active ? '▶' : '·'}
            </span>
            <span>{STAGE_LABELS[stage]}</span>
            <span className="sr-only">: {state}</span>
          </li>
        );
      })}
    </ol>
  );
}
