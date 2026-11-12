import type { CheckStatus } from '../data/types.ts';

const STYLE: Record<CheckStatus, { icon: string; label: string; cls: string }> = {
  pass: { icon: '✓', label: 'Pass', cls: 'bg-ok/15 text-ok border-ok/50' },
  warn: { icon: '!', label: 'Warning', cls: 'bg-warn/15 text-warn border-warn/50' },
  fail: { icon: '✕', label: 'Fail', cls: 'bg-bad/15 text-bad border-bad/50' },
};

/** Status indicator that uses icon + text, not colour alone. */
export function StatusLight({
  status,
  compact = false,
}: {
  status: CheckStatus;
  compact?: boolean;
}) {
  const s = STYLE[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${s.cls}`}
    >
      <span aria-hidden="true">{s.icon}</span>
      {compact ? <span className="sr-only">{s.label}</span> : s.label}
    </span>
  );
}
