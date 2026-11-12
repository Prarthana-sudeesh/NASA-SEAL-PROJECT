import { sfx } from '../sound.ts';
import { motion } from 'framer-motion';
import { announce } from '../../components/LiveRegion.tsx';
import type { Planet } from '../../data/types.ts';
import { SCORING } from '../config.ts';
import { quizFor } from '../engine.ts';

interface Props {
  planet: Planet;
  mission: number;
  choice: number | null;
  onAnswer: (choice: number) => void;
}

/** Dr. Hart's one-question science check (worth bonus points). */
export function QuizPanel({ planet, mission, choice, onAnswer }: Props) {
  const q = quizFor(planet, mission);
  const answered = choice !== null;
  return (
    <motion.section
      key="quiz"
      aria-labelledby="quiz-q"
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 60, opacity: 0 }}
      className="absolute right-[1.2%] top-[10%] z-10 flex w-[clamp(200px,26vw,340px)] flex-col gap-[3%] rounded-lg border-2 border-white/30 bg-[#0b2a52]/90 p-[1.4%] text-white backdrop-blur"
    >
      <h2 className="font-pixel text-[clamp(7px,0.8vw,10px)] uppercase tracking-wider text-[#ffe24a]">
        Science check · +{SCORING.quiz} pts
      </h2>
      <p id="quiz-q" className="text-[clamp(10px,1.05vw,14px)] font-semibold leading-snug">
        {q.question}
      </p>
      <ul className="flex flex-col gap-[0.5vw]" role="list">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const picked = i === choice;
          const cls = !answered
            ? 'border-[#8fc3ff]/50 bg-[#14417a] hover:border-[#ffe24a]'
            : isAnswer
              ? 'border-ok bg-ok/25'
              : picked
                ? 'border-bad bg-bad/25'
                : 'border-white/10 bg-[#14417a]/50 opacity-60';
          return (
            <li key={opt}>
              <motion.button
                type="button"
                disabled={answered}
                data-sfx="none"
                onClick={() => {
                  sfx(i === q.answer ? 'correct' : 'wrong');
                  onAnswer(i);
                  announce(i === q.answer ? `Correct! ${q.explain}` : `Not quite. ${q.explain}`);
                }}
                whileHover={answered ? undefined : { x: 4 }}
                whileTap={answered ? undefined : { scale: 0.97 }}
                animate={answered && picked && !isAnswer ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
                className={`flex w-full items-center gap-2 rounded-md border-2 px-2 py-[0.5vw] text-left text-[clamp(9px,0.95vw,13px)] ${cls}`}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-black/30 font-bold">
                  {answered
                    ? isAnswer
                      ? '✓'
                      : picked
                        ? '✕'
                        : String.fromCharCode(65 + i)
                    : String.fromCharCode(65 + i)}
                </span>
                {opt}
              </motion.button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-md p-2 text-[clamp(9px,0.95vw,13px)] ${choice === q.answer ? 'bg-ok/20 text-ok' : 'bg-bad/20 text-[#ffb0b0]'}`}
        >
          <strong>
            {choice === q.answer ? `Correct! +${SCORING.quiz} points.` : 'Not quite.'}
          </strong>{' '}
          {q.explain}
        </motion.p>
      )}
    </motion.section>
  );
}
