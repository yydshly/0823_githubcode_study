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

  it('does not reuse an old asset bundle from one generic material word', () => {
    expect(selectProjectCreativeAssets('研究天然纤维的结构变化和材料韧性')).toEqual([]);
  });

  it('does not combine two generic short words into a false topic match', () => {
    expect(selectProjectCreativeAssets('为窗边夜间风谱仪表现纤维带随城市风速弯曲的过程')).toEqual([]);
  });

  it('selects only the verified same-document pair for a paper restoration brief', () => {
    const selected = selectProjectCreativeAssets('为纸张修复工坊呈现受潮旧纸、手工补纸和墨迹恢复过程');
    expect(selected.map((asset) => asset.id)).toEqual([
      'paper-restoration-damaged-v1',
      'paper-restoration-resolved-v1'
    ]);
    expect(selected.every((asset) => asset.source === 'chatgpt-generated' && asset.required)).toBe(true);
  });

  it('selects the same-camera cinema continuity asset without mixing unrelated archives', () => {
    const selected = selectProjectCreativeAssets(
      '为逐渐消失的老电影院制作数字档案网页，用票根和年代变化保存城市放映记忆。'
    );

    expect(selected.map((asset) => asset.id)).toEqual(['cinema-memory-street-continuity-v1']);
    expect(selected[0]?.description).toContain('艺术化档案演绎');
    expect(selected[0]?.experience?.function).toBe('persistent');
  });

  it('prefers the four-state mortise sequence over the static environment', () => {
    const selected = selectProjectCreativeAssets(
      '为古建筑榫卯拆解课展示旧木构件逐步对齐、装配并咬合的过程。'
    );

    expect(selected.map((asset) => asset.id)).toEqual(['mortise-tenon-four-state-v2']);
    expect(selected[0]?.experience?.stateEvidence).toMatchObject({
      mode: 'sequence',
      distinctStates: 4,
      partGroups: 2
    });
  });

  it('requires subject identity and does not match a mechanical clock through generic restoration words', () => {
    const selected = selectProjectCreativeAssets(
      '为城市公共机械钟表建立修复档案，展示锈蚀、拆解、校准和重新走时。'
    );

    expect(selected.map((asset) => asset.id)).toEqual(['clock-restoration-four-state-v1']);
    expect(selected.some((asset) => asset.id.startsWith('mortise-tenon'))).toBe(false);
    expect(selected[0]?.experience?.stateEvidence).toMatchObject({
      mode: 'sequence',
      distinctStates: 4,
      partGroups: 6,
    });
  });

  it('does not treat generic restoration and archive terms as a reusable subject identity', () => {
    expect(selectProjectCreativeAssets(
      '为陌生器物建立修复档案，滚动展示拆解和校准过程。'
    )).toEqual([]);
  });

  it('selects the same-subject lantern sequence for a collapsible camping light brief', () => {
    const selected = selectProjectCreativeAssets(
      '为一款可折叠日光露营灯展示扁平收纳、半展开、完全展开与温暖点亮。'
    );

    expect(selected.map((asset) => asset.id)).toEqual(['collapsible-lantern-four-state-v1']);
    expect(selected[0]?.qualityLevel).toBe('L3-presentable');
    expect(selected[0]?.experience?.stateEvidence).toMatchObject({
      mode: 'sequence',
      distinctStates: 4,
      partGroups: 3
    });
  });

  it('selects the complete independent layer pack for a rooftop greenhouse brief', () => {
    const selected = selectProjectCreativeAssets(
      '为城市屋顶温室设计清晨网页，结露玻璃、番茄藤和城市天际线产生视差，并让湿度改变露珠覆盖。',
      4,
    );

    expect(selected.map((asset) => asset.id)).toEqual([
      'rooftop-greenhouse-environment-v1',
      'rooftop-greenhouse-subject-v1',
      'rooftop-greenhouse-foreground-v1',
      'rooftop-greenhouse-depth-v1',
    ]);
    expect(new Set(selected.map((asset) => asset.experience?.integration))).toEqual(new Set([
      'full-bleed-environment',
      'alpha-subject',
      'seamless-field',
    ]));
  });

  it('keeps every catalog URI local and every asset within the web payload budget', () => {
    for (const asset of projectCreativeAssetCatalog()) {
      expect(asset.uri).toMatch(/^\/creative-assets\/[a-zA-Z0-9._/-]+$/);
      expect(asset.uri).not.toContain('..');
      expect(asset.payloadBytes).toBeLessThanOrEqual(8_000_000);
    }
  });

  it('records deterministic alpha facts for every catalog asset assigned to transparent compositing', () => {
    const transparentAssets = projectCreativeAssetCatalog().filter((asset) => asset.experience?.integration === 'alpha-subject');
    expect(transparentAssets.length).toBeGreaterThan(0);
    for (const asset of transparentAssets) {
      expect(asset.features?.alpha, `${asset.id} must record inspected alpha facts`).toMatch(/^(?:none|binary|soft)$/);
    }
    expect(transparentAssets.find((asset) => asset.id === 'biomaterial-seed-pod-plate-v1')?.features?.alpha).toBe('none');
  });
});
