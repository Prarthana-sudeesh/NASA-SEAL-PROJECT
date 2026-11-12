export function ScienceNote({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      aria-label="Science note"
      className={`rounded-xl border border-model/40 bg-model/10 text-sm ${compact ? 'p-2 text-xs' : 'p-3'}`}
    >
      <strong className="text-model">
        <span aria-hidden="true">🔭 </span>Science note:
      </strong>{' '}
      Actually travelling to an exoplanet is far beyond what any human spacecraft can do today. Even
      the closest one would take tens of thousands of years with current rockets. The distances and
      planet data here are real, but the travel physics are simplified so missions are playable.
    </aside>
  );
}
