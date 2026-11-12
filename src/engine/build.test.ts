import {
  addComponent,
  buildStats,
  canPlace,
  emptyBuild,
  launchBlocks,
  placeInSlot,
  removeFromSlot,
  sanitizeBuild,
} from './build.ts';
import { GOOD_EASY, build } from '../test/fixtures.ts';

describe('build rules', () => {
  it('accepts valid drops and rejects invalid ones with a reason', () => {
    expect(canPlace('chem-mk1', 'thruster-0', 'easy').ok).toBe(true);
    const wrongSlot = canPlace('chem-mk1', 'payload', 'easy');
    expect(wrongSlot.ok).toBe(false);
    expect(wrongSlot.reason).toMatch(/can't go in the Payload System slot/);
    const notInPlay = canPlace('pressure-standard', 'pressure', 'easy');
    expect(notInPlay.ok).toBe(false);
    expect(notInPlay.reason).toMatch(/not used on Easy/);
    expect(canPlace('pressure-standard', 'pressure', 'medium').ok).toBe(true);
  });

  it('replaces a filled slot', () => {
    const b1 = placeInSlot(emptyBuild(), 'chem-mk1', 'thruster-0', 'easy').build;
    const r = placeInSlot(b1, 'chem-mk2', 'thruster-0', 'easy');
    expect(r.ok).toBe(true);
    expect(r.replaced).toBe('chem-mk1');
    expect(r.build.thrusters[0]).toBe('chem-mk2');
    expect(r.message).toMatch(/Replaced Chemical Mk1 with Chemical Mk2/);
  });

  it('removes from a slot', () => {
    const r = removeFromSlot(GOOD_EASY, 'fuel-0');
    expect(r.ok).toBe(true);
    expect(r.build.fuel[0]).toBeNull();
    expect(removeFromSlot(r.build, 'fuel-0').ok).toBe(false);
  });

  it('click/keyboard add fills the first free slot', () => {
    let b = emptyBuild();
    b = addComponent(b, 'tank-small', 'easy').build;
    b = addComponent(b, 'tank-large', 'easy').build;
    expect(b.fuel).toEqual(['tank-small', 'tank-large', null]);
    b = addComponent(b, 'tank-medium', 'easy').build;
    b = addComponent(b, 'tank-medium', 'easy').build; // full: replaces last
    expect(b.fuel).toEqual(['tank-small', 'tank-large', 'tank-medium']);
    expect(addComponent(b, 'heat-shield', 'easy').ok).toBe(false);
  });

  it('computes live stats', () => {
    const s = buildStats(GOOD_EASY);
    expect(s.cost).toBe(60 + 30 + 110 + 260);
    expect(s.dryMassT).toBe(4 + 1 + 8 + 14);
    expect(s.fuelT).toBe(80);
    expect(s.deltaVKms).toBeGreaterThan(0);
    expect(s.liftoffTWR).toBeCloseTo(1500 / (107 * 9.81), 2);
  });

  it('crew adds mass', () => {
    const a = buildStats(build({ ...GOOD_EASY, payload: 'crew-capsule' }));
    const b = buildStats(build({ ...GOOD_EASY, payload: 'crew-capsule', crew: 4 }));
    expect(b.dryMassT - a.dryMassT).toBeCloseTo(2);
  });

  it('hard-blocks launch for missing essentials, crew without cabin and >15% overspend', () => {
    const ids = launchBlocks(emptyBuild(), 'easy').map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(['no-payload', 'no-thruster', 'no-fuel']));
    expect(launchBlocks(build({ ...GOOD_EASY, crew: 1 }), 'easy').map((b) => b.id)).toContain(
      'crew-no-cabin',
    );
    expect(launchBlocks(GOOD_EASY, 'easy')).toEqual([]);
    const pricey = build({
      ...GOOD_EASY,
      payload: 'habitat-module',
      comms: 'deep-space-relay',
      fuel: ['tank-large', 'tank-large', 'tank-large'],
      thrusters: ['nuclear-thermal', 'ion-hybrid'],
    });
    expect(launchBlocks(pricey, 'easy').map((b) => b.id)).toContain('over-budget');
  });

  it('sanitises builds for a difficulty', () => {
    const b = sanitizeBuild(
      build({ ...GOOD_EASY, pressure: 'pressure-standard', crew: 5 }),
      'easy',
    );
    expect(b.pressure).toBeNull();
    expect(b.crew).toBe(2);
  });
});
