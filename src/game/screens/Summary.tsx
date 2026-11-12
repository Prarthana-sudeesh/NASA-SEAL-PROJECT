import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { announce } from '../../components/LiveRegion.tsx';
import { getPlanet } from '../../data/planets.ts';
import { getLeaderboardService } from '../../services/leaderboard/index.ts';
import { useGame } from '../../store/gameStore.ts';
import { useSettings } from '../../store/settingsStore.ts';
import { ATTEMPTS_PER_RUN, DIFFICULTIES } from '../config.ts';
import { BigButton, TopMenu } from '../ui/Hud.tsx';
import { sfx } from '../sound.ts';
import { Astronaut, Scientist, SpeechBubble } from '../ui/Pixel.tsx';
import { CommandCenter, Stage, WallScreen } from '../ui/Scenery.tsx';
import { avg } from './Mission.tsx';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export function Summary() {
  const { run, player, markSubmitted, newCampaign, go } = useGame();
  const addMyEntry = useSettings((s) => s.addMyEntry);
  const [status, setStatus] = useState<Status>(run?.submittedEntryId ? 'saved' : 'idle');
  const started = useRef(false);
  useEffect(() => sfx('fanfare'), []);
  const [error, setError] = useState('');
  const attempts = run?.attempts ?? [];
  const totals = attempts.map((a) => a.result.total);
  const average = avg(totals);
  const complete = attempts.length >= ATTEMPTS_PER_RUN;
  const planets = [...new Set(attempts.map((a) => getPlanet(a.planetId)?.name ?? a.planetId))];

  const submit = async () => {
    if (!run || !player) return;
    setStatus('saving');
    try {
      const e = await (
        await getLeaderboardService()
      ).submit({
        name: player.username,
        difficulty: run.difficulty,
        average,
        best: Math.max(...totals),
        planetsVisited: planets,
        date: new Date().toISOString(),
      });
      markSubmitted(e.id);
      addMyEntry(e.id);
      setStatus('saved');
      announce(
        `Average ${average} posted to the ${DIFFICULTIES[run.difficulty].label} leaderboard.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save the score.');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (complete && run && !run.submittedEntryId && !started.current) {
      started.current = true;
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  if (!run || attempts.length === 0) {
    return (
      <div className="p-6 text-center">
        <button type="button" className="big-btn" onClick={() => go('mission')}>
          Mission control
        </button>
      </div>
    );
  }
  const best = Math.max(...totals);
  const worst = Math.min(...totals);
  const wins = attempts.filter((a) => a.result.success).length;

  return (
    <Stage>
      <CommandCenter>
        <TopMenu />
        <motion.h1
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="title-font outlined absolute left-1/2 top-[3%] -translate-x-1/2 whitespace-nowrap text-[clamp(20px,3.6vw,50px)]"
        >
          CAMPAIGN COMPLETE
        </motion.h1>
        <WallScreen
          title={`${DIFFICULTIES[run.difficulty].label} campaign`}
          className="left-1/2 top-[16%] h-[58%] w-[56%] -translate-x-1/2"
        >
          <div className="grid h-full grid-cols-[1fr_1.3fr] gap-[3%] text-[clamp(8px,0.95vw,13px)]">
            <div className="flex flex-col justify-center gap-[6%] text-center">
              <div>
                <div className="text-[#9fd8e6]">Average score</div>
                <div className="title-font text-[clamp(28px,5vw,70px)] text-[#ffb35a] tabular-nums">
                  {average}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <div className="text-[#9fd8e6]">Best</div>
                  <div className="font-bold text-ok tabular-nums">{best}</div>
                </div>
                <div>
                  <div className="text-[#9fd8e6]">Worst</div>
                  <div className="font-bold text-bad tabular-nums">{worst}</div>
                </div>
                <div>
                  <div className="text-[#9fd8e6]">Round trips</div>
                  <div className="font-bold tabular-nums">
                    {wins}/{attempts.length}
                  </div>
                </div>
              </div>
              <p aria-live="polite" className={status === 'error' ? 'text-bad' : 'text-ok'}>
                {status === 'saving' && 'Posting to the leaderboard…'}
                {status === 'saved' && `✓ Posted to the leaderboard as ${player?.username}`}
                {status === 'error' && (
                  <>
                    ✕ {error}{' '}
                    <button type="button" className="underline" onClick={() => void submit()}>
                      Retry
                    </button>
                  </>
                )}
              </p>
            </div>
            <ol className="flex min-h-0 flex-col gap-[2%] overflow-y-auto pr-1">
              {attempts.map((a, i) => (
                <motion.li
                  key={a.n}
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-2"
                >
                  <span className="w-5 tabular-nums text-[#9fd8e6]">{a.n}</span>
                  <span className="flex-1 truncate">{getPlanet(a.planetId)?.name}</span>
                  <span className={a.result.success ? 'text-ok' : 'text-bad'}>
                    {a.result.success ? '✓' : '✕'}
                  </span>
                  <span className="relative h-2 w-[30%] overflow-hidden rounded bg-[#0b2f4d]">
                    <motion.span
                      className="absolute inset-y-0 left-0 bg-[#ffb35a]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (a.result.total / 1300) * 100)}%` }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                    />
                  </span>
                  <span className="w-10 text-right font-bold tabular-nums">{a.result.total}</span>
                </motion.li>
              ))}
            </ol>
          </div>
        </WallScreen>
        <div className="absolute bottom-[5%] left-[2%] w-[7%]">
          <Astronaut name={player?.username} enter={false} />
        </div>
        <div className="absolute bottom-[5%] left-[10%] w-[6.5%]">
          <Scientist enter={false} />
        </div>
        <div className="absolute bottom-[30%] left-[6%] z-10 max-w-[30%]">
          <SpeechBubble
            speaker="Dr. Hart"
            text={`Ten missions done! Your average of ${average} is what counts on the leaderboard. Consistency beats one lucky launch.`}
          />
        </div>
        <div className="absolute bottom-[5%] right-[3%] flex gap-[1vw]">
          <button
            type="button"
            className="tool-btn px-3 py-2 text-[13px]"
            onClick={() => go('leaderboard')}
          >
            🏆 Leaderboard
          </button>
          <BigButton onClick={newCampaign} className="text-[clamp(14px,2vw,28px)]">
            NEW CAMPAIGN
          </BigButton>
        </div>
      </CommandCenter>
    </Stage>
  );
}
