import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App.tsx';
import { ATTEMPTS_PER_RUN } from '../config/difficulty.ts';
import { emptyBuild } from '../engine/build.ts';
import { resetGameStore, useGame } from './gameStore.ts';
import { safeStorage, takeStorageNotice } from './persistence.ts';

const GOOD = {
  ...emptyBuild(),
  payload: 'probe-pod',
  comms: 'low-gain',
  fuel: ['tank-large', null, null] as [string, null, null],
  thrusters: ['nuclear-thermal', null] as [string, null],
};

describe('game store', () => {
  beforeEach(() => resetGameStore());

  it('records attempts and stops at 10', () => {
    const s = useGame.getState();
    s.startRun('easy');
    for (let i = 0; i < ATTEMPTS_PER_RUN + 2; i++) {
      useGame.getState().selectPlanet('proxima-cen-b');
      useGame.getState().setBuild(GOOD);
      useGame.getState().launch();
    }
    const run = useGame.getState().run!;
    expect(run.attempts).toHaveLength(ATTEMPTS_PER_RUN);
    expect(run.attempts.map((a) => a.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    useGame.getState().nextAttempt();
    expect(useGame.getState().screen).toBe('summary');
  });

  it('refuses to launch a hard-blocked build', () => {
    useGame.getState().startRun('easy');
    useGame.getState().selectPlanet('proxima-cen-b');
    expect(useGame.getState().launch()).toBeNull();
  });

  it('corrupt saved state resets cleanly with a message', () => {
    localStorage.setItem('rocket-builder:game', '{oops');
    expect(safeStorage.getItem('rocket-builder:game')).toBeNull();
    expect(localStorage.getItem('rocket-builder:game')).toBeNull();
    expect(takeStorageNotice()).toMatch(/reset/);
  });

  it('structurally invalid saved state is rejected on rehydrate', async () => {
    localStorage.setItem(
      'rocket-builder:game',
      JSON.stringify({ state: { playerName: 5, build: {} }, version: 1 }),
    );
    await useGame.persist.rehydrate();
    expect(useGame.getState().playerName).toBe('');
    expect(takeStorageNotice()).toMatch(/damaged/);
  });
});

describe('<App /> smoke test', () => {
  beforeEach(() => resetGameStore());

  it('goes from briefing to difficulty selection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Skip briefing' }));
    await user.type(screen.getByLabelText(/Call-sign/), 'A');
    await user.click(screen.getByRole('button', { name: /Report for duty/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 2/);
    await user.type(screen.getByLabelText(/Call-sign/), 'ce');
    await user.click(screen.getByRole('button', { name: /Report for duty/ }));
    expect(screen.getByRole('heading', { name: 'Choose your difficulty' })).toBeInTheDocument();
    expect(useGame.getState().playerName).toBe('Ace');
    expect(screen.getByText(/not endorsed by NASA/)).toBeInTheDocument();
  });
});
