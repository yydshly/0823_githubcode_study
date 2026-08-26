import { describe, expect, it } from 'vitest';
import { projectCreativeAssetCatalog, selectProjectCreativeAssets } from '../src/generation/creative-asset-catalog';

describe('project creative asset catalog', () => {
  it('selects the proven fashion hero for a matching creative brief', () => {
    const selected = selectProjectCreativeAssets('为先锋时装品牌设计梦幻流体光幕和编辑感沉浸式网页');
    expect(selected).toHaveLength(2);
    expect(selected.map((asset) => asset.id)).toEqual(expect.arrayContaining([
      'fashion-fluid-couture-v1',
      'fashion-fluid-couture-cutout-v2'
    ]));
    expect(selected.every((asset) => asset.source === 'chatgpt-generated')).toBe(true);
  });

  it('does not force an unrelated visual asset into a different brief', () => {
    expect(selectProjectCreativeAssets('为海洋档案馆制作面向学生的证据探索网页')).toEqual([]);
  });

  it('keeps every catalog URI local and every asset within the web payload budget', () => {
    for (const asset of projectCreativeAssetCatalog()) {
      expect(asset.uri).toMatch(/^\/creative-assets\/[a-zA-Z0-9._/-]+$/);
      expect(asset.uri).not.toContain('..');
      expect(asset.payloadBytes).toBeLessThanOrEqual(8_000_000);
    }
  });
});
