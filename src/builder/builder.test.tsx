import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyBuild } from '../engine/build.ts';
import { Builder } from '../screens/Builder.tsx';
import { resetGameStore, useGame } from '../store/gameStore.ts';
import { resolveDrop } from './dropLogic.ts';

describe('resolveDrop (drag-and-drop rules)', () => {
  it('valid drop from palette snaps into the slot', () => {
    const r = resolveDrop(
      emptyBuild(),
      { from: 'palette', componentId: 'probe-pod' },
      'slot:payload',
      'easy',
    );
    expect(r.ok).toBe(true);
    expect(r.build.payload).toBe('probe-pod');
  });

  it('invalid drop bounces back with a reason', () => {
    const before = emptyBuild();
    const r = resolveDrop(
      before,
      { from: 'palette', componentId: 'chem-mk1' },
      'slot:payload',
      'easy',
    );
    expect(r.ok).toBe(false);
    expect(r.build).toBe(before);
    expect(r.message).toMatch(/can't go in the Payload System slot/);
    const off = resolveDrop(before, { from: 'palette', componentId: 'chem-mk1' }, null, 'easy');
    expect(off.ok).toBe(false);
    expect(off.message).toMatch(/outside the rocket/);
  });

  it('dropping onto a filled slot replaces it', () => {
    const b1 = resolveDrop(
      emptyBuild(),
      { from: 'palette', componentId: 'tank-small' },
      'slot:fuel-0',
      'easy',
    ).build;
    const r = resolveDrop(
      b1,
      { from: 'palette', componentId: 'tank-large' },
      'slot:fuel-0',
      'easy',
    );
    expect(r.build.fuel[0]).toBe('tank-large');
    expect(r.message).toMatch(/Replaced Small Tank with Large Tank/);
  });

  it('dragging a fitted part out removes it', () => {
    const b1 = resolveDrop(
      emptyBuild(),
      { from: 'palette', componentId: 'tank-small' },
      'slot:fuel-0',
      'easy',
    ).build;
    const r = resolveDrop(
      b1,
      { from: 'slot', slot: 'fuel-0', componentId: 'tank-small' },
      'palette-drop',
      'easy',
    );
    expect(r.ok).toBe(true);
    expect(r.build.fuel[0]).toBeNull();
  });

  it('moving between compatible slots swaps', () => {
    let b = resolveDrop(
      emptyBuild(),
      { from: 'palette', componentId: 'tank-small' },
      'slot:fuel-0',
      'easy',
    ).build;
    b = resolveDrop(b, { from: 'palette', componentId: 'tank-large' }, 'slot:fuel-1', 'easy').build;
    const r = resolveDrop(
      b,
      { from: 'slot', slot: 'fuel-0', componentId: 'tank-small' },
      'slot:fuel-1',
      'easy',
    );
    expect(r.build.fuel).toEqual(['tank-large', 'tank-small', null]);
    const bad = resolveDrop(
      b,
      { from: 'slot', slot: 'fuel-0', componentId: 'tank-small' },
      'slot:comms',
      'easy',
    );
    expect(bad.ok).toBe(false);
  });
});

describe('<Builder />', () => {
  beforeEach(() => {
    resetGameStore();
    useGame.getState().startRun('easy');
    useGame.getState().selectPlanet('proxima-cen-b');
    useGame.setState({ screen: 'builder' });
  });

  it('adds components with the keyboard (Add buttons) and updates live stats', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    const addProbe = screen.getByRole('button', { name: 'Add Probe Pod to rocket' });
    addProbe.focus();
    await user.keyboard('{Enter}');
    expect(useGame.getState().build.payload).toBe('probe-pod');
    await user.click(screen.getByRole('button', { name: 'Add Large Tank to rocket' }));
    await user.click(screen.getByRole('button', { name: 'Add Nuclear Thermal to rocket' }));
    await user.click(screen.getByRole('button', { name: 'Add Low-Gain Antenna to rocket' }));
    const stats = screen.getByRole('region', { name: 'Live rocket statistics' });
    expect(within(stats).getByText('107 t')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Review & launch/ })[0]).toBeEnabled();
  });

  it('removes a fitted component with its remove button', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole('button', { name: 'Add Small Tank to rocket' }));
    expect(useGame.getState().build.fuel[0]).toBe('tank-small');
    await user.click(screen.getByRole('button', { name: 'Remove Small Tank from Fuel Tank 1' }));
    expect(useGame.getState().build.fuel[0]).toBeNull();
  });

  it('blocks launch until the essentials are fitted', () => {
    render(<Builder />);
    expect(screen.getAllByRole('button', { name: /Review & launch/ })[0]).toBeDisabled();
    expect(screen.getByText('Add a payload system.')).toBeInTheDocument();
  });

  it('does not offer modules outside the difficulty', () => {
    render(<Builder />);
    expect(screen.queryByRole('button', { name: 'Add Standard Tank to rocket' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add Heat Shield to rocket' })).toBeNull();
  });
});
