import { describe, expect, it } from 'vitest';
import { generatedHostStyle } from '../server/creative-api-plugin.ts';

describe('generated page host layering', () => {
  it('pins the SDK canvas and keeps generated semantic content above it', () => {
    expect(generatedHostStyle).toContain('#app>.generated-canvas');
    expect(generatedHostStyle).toContain('position:fixed!important');
    expect(generatedHostStyle).toContain('#app>:not(.generated-canvas):not(.generated-loading)');
    expect(generatedHostStyle).toContain('z-index:1');
  });
});
