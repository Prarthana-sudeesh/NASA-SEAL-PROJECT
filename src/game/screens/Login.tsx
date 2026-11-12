import { motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { validateName } from '../../services/nameValidation.ts';
import { useGame } from '../../store/gameStore.ts';
import { isIosBrowser, useInstallPrompt } from '../../app/pwa.ts';
import { Astronaut, Scientist } from '../ui/Pixel.tsx';
import { CommandCenter, Stage } from '../ui/Scenery.tsx';
import { TopMenu } from '../ui/Hud.tsx';
import { sfx } from '../sound.ts';

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return 'Enter your email.';
  if (v.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    return 'That email doesn’t look right (example: you@school.org).';
  return null;
}

export function Login() {
  const signIn = useGame((s) => s.signIn);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ username?: string; email?: string }>({});
  const install = useInstallPrompt();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const u = validateName(username);
    const em = validateEmail(email);
    const next = { username: u.ok ? undefined : u.error, email: em ?? undefined };
    setErrors(next);
    if (u.ok && !em) {
      sfx('powerUp');
      signIn({ username: u.value, email: email.trim() });
    } else sfx('error');
  };

  return (
    <Stage>
      <CommandCenter>
        <TopMenu />
        <div className="absolute inset-0 grid place-items-center p-[2%]">
          <motion.form
            onSubmit={submit}
            noValidate
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            className="relative z-10 w-[min(440px,60%)] rounded-2xl border-2 border-[#5ff3ff]/60 bg-[#06192e]/90 p-[2.4%] text-[#e6fbff] shadow-[0_0_40px_rgba(95,243,255,0.3)] backdrop-blur"
            aria-labelledby="login-title"
          >
            <p className="font-pixel text-[clamp(7px,0.8vw,10px)] tracking-widest text-[#5ff3ff]">
              MISSION CONTROL · CREW LOGIN
            </p>
            <h1
              id="login-title"
              className="title-font mt-1 text-[clamp(22px,3.4vw,44px)] leading-none"
            >
              ROCKET <span className="text-[#ffb35a]">BUILDER</span>
            </h1>
            <p className="mt-1 text-[clamp(10px,1vw,14px)] text-[#a9d6e5]">
              Build rockets for round trips to real exoplanets.
            </p>
            <div className="mt-[4%] flex flex-col gap-[3%]">
              <label className="text-[clamp(10px,1vw,14px)] font-semibold" htmlFor="username">
                Username{' '}
                <span className="font-normal text-[#a9d6e5]">(shown on the leaderboard)</span>
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="nickname"
                maxLength={24}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-err' : undefined}
                className="game-input"
                placeholder="e.g. Nova-7"
              />
              {errors.username && (
                <p id="username-err" role="alert" className="text-[12px] text-bad">
                  ✕ {errors.username}
                </p>
              )}
              <label className="text-[clamp(10px,1vw,14px)] font-semibold" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-err' : 'email-note'}
                className="game-input"
                placeholder="you@school.org"
              />
              {errors.email ? (
                <p id="email-err" role="alert" className="text-[12px] text-bad">
                  ✕ {errors.email}
                </p>
              ) : (
                <p id="email-note" className="text-[11px] text-[#a9d6e5]">
                  Saved only on this device. It is never shown on the leaderboard.
                </p>
              )}
              <button
                type="submit"
                className="big-btn mt-[2%] self-center text-[clamp(18px,2.4vw,30px)]"
              >
                ENTER
              </button>
              {install && (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="tool-btn self-center px-3 py-1 text-[12px]"
                >
                  📲 Install as an app
                </button>
              )}
              {isIosBrowser() && (
                <p className="text-center text-[11px] text-[#a9d6e5]">
                  On iPhone or iPad: tap Share, then “Add to Home Screen” to install the app.
                </p>
              )}
            </div>
          </motion.form>
        </div>
        <div className="absolute bottom-[4%] left-[3%] w-[8%]">
          <Astronaut />
        </div>
        <div className="absolute bottom-[4%] right-[3%] w-[8%]">
          <Scientist />
        </div>
      </CommandCenter>
    </Stage>
  );
}
