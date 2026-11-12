import { FULL_BRIEFING, SHORT_BRIEFING } from '../config/characters.ts';
import { Dialogue } from '../components/Dialogue.tsx';
import { ScienceNote } from '../components/ScienceNote.tsx';
import { useGame } from '../store/gameStore.ts';

export function Briefing() {
  const { seenBriefing, playerName, setPlayerName, finishBriefing } = useGame();
  return (
    <div className="flex flex-col gap-4">
      <header className="text-center">
        <p className="eyebrow">Team SEAL · NASA Space Apps Challenge</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">
          Rocket <span className="text-accent">Builder</span>
        </h1>
        <p className="mt-2 text-muted">Design rockets for round trips to real exoplanets.</p>
      </header>
      <Dialogue
        lines={seenBriefing ? SHORT_BRIEFING : FULL_BRIEFING}
        initialName={playerName}
        onDone={(name) => {
          setPlayerName(name);
          finishBriefing();
        }}
      />
      <div className="mx-auto max-w-2xl">
        <ScienceNote />
      </div>
    </div>
  );
}
