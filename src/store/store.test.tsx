import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App.tsx';
import { validateEmail } from '../game/screens/Login.tsx';
import { ATTEMPTS_PER_RUN } from '../game/config.ts';
import { resetGameStore, useGame } from './gameStore.ts';
import { safeStorage, takeStorageNotice } from './persistence.ts';

const GOOD = {
  payload: 'payload-capsule',
  antenna: 'antenna-low',
  body: 'body-medium',
  hull: 'hull-aluminium',
  engine: 'engine-small',
  crew: 1,
};

describe('game store', () => {
  beforeEach(() => resetGameStore());

  it('records 10 launches per campaign, then shows the summary', () => {
    const s = useGame.getState();
    s.signIn({ username: 'Ace', email: 'ace@x.org' });
    s.choosePlanet('proxima-cen-b');
    s.setBuild(GOOD);
    s.setDials({ fuel: 72, thrust: 66, pressure: 1 });
    for (let i = 0; i < ATTEMPTS_PER_RUN; i++) useGame.getState().launch();
    expect(useGame.getState().run!.attempts).toHaveLength(ATTEMPTS_PER_RUN);
    expect(useGame.getState().run!.attempts.every((a) => a.result.success)).toBe(true);
    useGame.getState().next();
    expect(useGame.getState().screen).toBe('summary');
    // An 11th launch starts a fresh campaign.
    useGame.getState().launch();
    expect(useGame.getState().run!.attempts).toHaveLength(1);
  });

  it('refuses to launch an unfinished rocket', () => {
    useGame.getState().signIn({ username: 'Ace', email: 'ace@x.org' });
    expect(useGame.getState().launch()).toBeNull();
  });

  it('corrupt saved state resets cleanly with a message', () => {
    localStorage.setItem('rocket-builder:v2', '{oops');
    expect(safeStorage.getItem('rocket-builder:v2')).toBeNull();
    expect(takeStorageNotice()).toMatch(/reset/);
  });

  it('structurally invalid saved state is rejected on rehydrate', async () => {
    localStorage.setItem(
      'rocket-builder:v2',
      JSON.stringify({ state: { player: { username: 5 }, build: {} }, version: 2 }),
    );
    await useGame.persist.rehydrate();
    expect(useGame.getState().player).toBeNull();
    expect(takeStorageNotice()).toMatch(/damaged/);
  });
});

describe('sign in', () => {
  beforeEach(() => resetGameStore());

  it('validates email', () => {
    expect(validateEmail('')).toMatch(/Enter/);
    expect(validateEmail('nope')).toMatch(/doesn’t look right/);
    expect(validateEmail('a@b.co')).toBeNull();
  });

  it('signs in with a username and email and opens mission control', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/Username/), 'A');
    await user.type(screen.getByLabelText('Email'), 'bad');
    await user.click(screen.getByRole('button', { name: 'ENTER' }));
    expect(
      screen
        .getAllByRole('alert')
        .map((a) => a.textContent)
        .join(' '),
    ).toMatch(/at least 2/);
    await user.type(screen.getByLabelText(/Username/), 'ce');
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'ace@school.org');
    await user.click(screen.getByRole('button', { name: 'ENTER' }));
    expect(useGame.getState().player).toEqual({ username: 'Ace', email: 'ace@school.org' });
    expect(await screen.findByRole('button', { name: 'BUILD ROCKET' })).toBeInTheDocument();
    expect(screen.getByText(/not endorsed by NASA/)).toBeInTheDocument();
  });
});
