import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { useGame } from '../../store/gameStore.ts';
import { useSettings } from '../../store/settingsStore.ts';
import { useInstallPrompt } from '../../app/pwa.ts';

/** Outlined game text block (white with dark outline), used for on-screen readouts. */
export function Readout({
  lines,
  className = '',
}: {
  lines: (string | [string, string])[];
  className?: string;
}) {
  return (
    <dl
      className={`outlined pointer-events-none absolute text-[clamp(9px,1.05vw,14px)] leading-[1.35] ${className}`}
    >
      {lines.map((l, i) =>
        typeof l === 'string' ? (
          <div key={i} className="font-bold">
            {l}
          </div>
        ) : (
          <div key={i} className="flex gap-1">
            <dt>{l[0]}:</dt>
            <dd className="font-bold">{l[1]}</dd>
          </div>
        ),
      )}
    </dl>
  );
}

function IconButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      whileHover={{ scale: 1.1, rotate: 4 }}
      whileTap={{ scale: 0.9 }}
      className="grid h-[clamp(30px,3.6vw,46px)] w-[clamp(30px,3.6vw,46px)] place-items-center rounded-full border-2 border-[#0b0f1e] bg-white text-[clamp(14px,1.6vw,22px)] shadow-[0_3px_0_#0b0f1e]"
    >
      <span aria-hidden="true">{children}</span>
    </motion.button>
  );
}

/** Top-right game menu: leaderboard, sound, motion, sign out. */
export function TopMenu() {
  const { go, signOut, player } = useGame();
  const { sound, toggleSound, motion: m, setMotion } = useSettings();
  const install = useInstallPrompt();
  return (
    <nav aria-label="Game menu" className="absolute right-[1.5%] top-[2%] z-20 flex gap-[0.6vw]">
      {install && (
        <IconButton label="Install Rocket Builder as an app" onClick={() => void install()}>
          📲
        </IconButton>
      )}
      <IconButton label="Leaderboard" onClick={() => go('leaderboard')}>
        🏆
      </IconButton>
      <IconButton
        label={sound ? 'Mute sound' : 'Turn sound on'}
        onClick={toggleSound}
        pressed={sound}
      >
        {sound ? '🔊' : '🔇'}
      </IconButton>
      <IconButton
        label="Reduce motion"
        onClick={() => setMotion(m === 'reduced' ? 'full' : 'reduced')}
        pressed={m === 'reduced'}
      >
        {m === 'reduced' ? '⏸' : '✨'}
      </IconButton>
      {player && (
        <IconButton label={`Sign out ${player.username}`} onClick={signOut}>
          ⏻
        </IconButton>
      )}
    </nav>
  );
}

/** Chunky outlined game button (like a big START label). */
export function BigButton({
  children,
  onClick,
  disabled,
  className = '',
  describedBy,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  describedBy?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-describedby={describedBy}
      whileHover={disabled ? undefined : { scale: 1.06 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      animate={disabled || reduced ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className={`big-btn ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** Small pill button for in-game panels. */
export function Pill({
  children,
  onClick,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`rounded-md border px-[0.7vw] py-[0.3vw] text-[clamp(9px,0.95vw,13px)] font-semibold transition-colors ${
        active
          ? 'border-[#ffe24a] bg-[#ffe24a] text-[#0b0f1e]'
          : 'border-[#5ff3ff]/40 bg-[#0b1d33]/80 text-[#cdf8ff] hover:border-[#5ff3ff]'
      }`}
    >
      {children}
    </button>
  );
}
