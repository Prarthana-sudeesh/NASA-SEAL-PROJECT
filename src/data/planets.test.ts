import raw from './planets.json';
import { PLANETS, planetsFor, SNAPSHOT_ERRORS, validateSnapshot } from './planets.ts';

describe('planets.json snapshot', () => {
  it('passes schema validation', () => {
    expect(SNAPSHOT_ERRORS).toEqual([]);
    expect(validateSnapshot(raw)).toEqual([]);
  });

  it('records source and retrieval date', () => {
    expect(raw.source).toBe('NASA Exoplanet Archive');
    expect(raw.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(['easy', 'medium', 'hard'] as const)('%s pool has 8–12 planets', (d) => {
    const n = planetsFor(d).length;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(12);
  });

  it('badges real values NASA DATA and derived values GAME MODEL', () => {
    for (const p of PLANETS) {
      expect(p.distanceLy.source).toBe('nasa');
      expect(p.massEarth.source).toBe('nasa');
      expect(p.surfaceGravityG.source).toBe('model');
      expect(p.atmosphere.source).toBe('model');
      expect(p.radiusEarth.value).toBeLessThanOrEqual(2.5);
    }
  });

  it('easy planets are near and mild', () => {
    for (const p of planetsFor('easy')) {
      expect(p.distanceLy.value).toBeLessThan(20);
      expect(p.surfaceGravityG.value).toBeGreaterThanOrEqual(0.6);
      expect(p.surfaceGravityG.value).toBeLessThanOrEqual(1.3);
    }
  });

  it('rejects broken snapshots', () => {
    expect(validateSnapshot(null).length).toBeGreaterThan(0);
    expect(validateSnapshot({ retrievedAt: 'x', planets: [{ id: 'a' }] }).length).toBeGreaterThan(
      0,
    );
  });
});
