import { useGame } from '../store/gameStore.ts';

/** Empty/error state shown when a screen is opened without the data it needs. */
export function ScreenMissing({ what }: { what: string }) {
  const go = useGame((s) => s.go);
  const run = useGame((s) => s.run);
  return (
    <div className="panel mx-auto max-w-md p-6 text-center" role="alert">
      <p className="text-lg font-semibold">This screen needs {what}.</p>
      <p className="mt-1 text-sm text-muted">Let’s get you back on track.</p>
      <button
        type="button"
        className="btn btn-primary mt-4"
        onClick={() => go(run ? 'planets' : 'difficulty')}
      >
        {run ? 'Choose a planet' : 'Choose difficulty'}
      </button>
    </div>
  );
}
