import { describe, expect, it } from 'vitest';
import { generatedDprCap } from '../src/generated-sdk/three-runtime.ts';

describe('generated Three.js runtime boundary', () => {
  it('keeps quality-dependent DPR caps bounded and configurable', () => {
    expect(generatedDprCap('low')).toBe(1);
    expect(generatedDprCap('balanced')).toBe(1.5);
    expect(generatedDprCap('high')).toBe(2);
    expect(generatedDprCap('high', { maxDpr: 1.6 })).toBe(1.6);
    expect(generatedDprCap('low', { lowQualityMaxDpr: 0.8 })).toBe(0.8);
  });
});
