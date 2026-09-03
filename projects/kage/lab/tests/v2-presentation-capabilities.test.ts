import { describe, expect, it } from 'vitest';
import {
  mediaScrollScrubCapability,
  presentationCapabilityCatalog,
  selectPresentationCapability
} from '../src/v2/presentation-capabilities.ts';

describe('V2 presentation capability routing', () => {
  it('selects media-scroll-scrub for a continuous dream-memory experience', () => {
    const selection = selectPresentationCapability({
      brief: '为梦境记录产品设计网页，滚动时记忆碎片逐渐形成同一房间，最后记录今晚的梦。',
      pattern: 'environmental-memory',
      assetModalities: ['image-sequence']
    });

    expect(selection.selected).toBe(true);
    expect(selection.capabilityId).toBe('media-scroll-scrub');
    expect(selection.score).toBeGreaterThanOrEqual(65);
    expect(selection.blockers).toEqual([]);
    expect(selection.contract?.acceptanceEvidence).toContain('screenshot-mobile');
  });

  it('does not force media-scroll-scrub onto a GLB product inspection goal', () => {
    const selection = selectPresentationCapability({
      brief: '使用真实 GLB 展示声学设备拆解，并允许自由旋转检查内部结构。',
      pattern: 'product-atmosphere',
      assetModalities: ['model-3d']
    });

    expect(selection.selected).toBe(false);
    expect(selection.capabilityId).toBeNull();
    expect(selection.blockers.length).toBeGreaterThan(0);
  });

  it('keeps runtime evidence and production budgets in the capability contract', () => {
    expect(presentationCapabilityCatalog).toHaveLength(1);
    expect(mediaScrollScrubCapability.evidenceLevel).toBe('runtime-verified');
    expect(mediaScrollScrubCapability.assetContract.maximumInitialBytes)
      .toBeLessThan(mediaScrollScrubCapability.assetContract.maximumTotalBytes);
    expect(mediaScrollScrubCapability.runtimeContract.smoothingFactor).toBe(0.12);
  });
});
