import { describe, expect, it } from 'vitest';
import { mapSoundboardTone } from '../cases/runs/dedicated-b4d381a24320/src/audio';

describe('soundboard audible contrast mapping', () => {
  const reference = mapSoundboardTone({ thickness: 2.95, frequency: 213.2, deflection: 0.53 });

  it('keeps the reference centered without inventing a difference', () => {
    expect(reference.semitoneDelta).toBeCloseTo(0, 5);
    expect(reference.fundamentalHz).toBeCloseTo(213.2, 1);
    expect(reference.decaySeconds).toBeCloseTo(1, 2);
  });

  it('makes a thinner responsive plate audibly lower, longer and brighter', () => {
    const thin = mapSoundboardTone({ thickness: 2.70, frequency: 202.7, deflection: 0.68 });
    expect(reference.fundamentalHz - thin.fundamentalHz).toBeGreaterThan(20);
    expect(thin.semitoneDelta).toBeLessThan(-1.8);
    expect(thin.decaySeconds - reference.decaySeconds).toBeGreaterThan(0.22);
    expect(thin.brightnessHz - reference.brightnessHz).toBeGreaterThan(800);
    expect(thin.modeRatios[1]).toBeLessThan(reference.modeRatios[1]);
    expect(thin.modeGains[2]).toBeGreaterThan(reference.modeGains[2]);
  });

  it('makes a thicker stiff plate audibly higher, shorter and more restrained', () => {
    const thick = mapSoundboardTone({ thickness: 3.15, frequency: 221.6, deflection: 0.42 });
    expect(thick.fundamentalHz - reference.fundamentalHz).toBeGreaterThan(18);
    expect(thick.semitoneDelta).toBeGreaterThan(1.4);
    expect(reference.decaySeconds - thick.decaySeconds).toBeGreaterThan(0.20);
    expect(reference.brightnessHz - thick.brightnessHz).toBeGreaterThan(650);
    expect(thick.modeGains[2]).toBeLessThan(reference.modeGains[2]);
  });
});
