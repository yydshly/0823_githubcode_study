import { describe, expect, it } from 'vitest';
import { selectProjectCreativeAssets } from '../src/generation/creative-asset-catalog';

describe('project creative asset narrative selection', () => {
  it('selects the purpose-built rain recorder with its environment instead of a generic acoustic instrument', () => {
    const assets = selectProjectCreativeAssets('为一枚会收集清晨雨声的桌面声学器物设计网页，在窗边接收雨声并保存这一刻的声音。');
    expect(assets.map((asset) => asset.id)).toEqual(['rain-window-environment-v1', 'rain-memory-recorder-v1']);
    expect(assets.map((asset) => asset.experience?.function)).toEqual(['establish', 'persistent']);
    expect(assets[1]?.exclusiveWhenMatched).toBe(true);
    expect(assets.some((asset) => asset.id === 'acoustic-resonance-instrument-v1')).toBe(false);
  });

  it('selects the complete best greenhouse sequence instead of an arbitrary single hero', () => {
    const assets = selectProjectCreativeAssets('为建筑师呈现生物材料从种子纤维生长成夜间温室表皮，并预约参观。');
    expect(assets).toHaveLength(3);
    expect(assets.map((asset) => asset.experience?.function)).toEqual(['establish', 'transform', 'resolve']);
    expect(assets.every((asset) => asset.required)).toBe(true);
    expect(assets.map((asset) => asset.experience?.anchor)).toEqual([.06, .5, .94]);
  });

  it('selects three continuous observatory states for approach, entry and star-atlas reveal', () => {
    const assets = selectProjectCreativeAssets('为漂浮在云层中的未来天文观测站设计沉浸式网页，进入透明穹顶并看到星图数据在空间展开。');
    expect(assets).toHaveLength(3);
    expect(assets.map((asset) => asset.id)).toEqual([
      'observatory-cloud-approach-v1',
      'observatory-dome-interior-v1',
      'observatory-star-atlas-v1'
    ]);
    expect(assets.map((asset) => asset.experience?.function)).toEqual(['establish', 'transform', 'resolve']);
    expect(assets.every((asset) => asset.required)).toBe(true);
    expect(assets.every((asset) => asset.source === 'chatgpt-generated')).toBe(true);
  });

  it('selects one continuous dream room across awakening, exploration and recording', () => {
    const assets = selectProjectCreativeAssets('为一款帮助人记录梦境的产品设计网页。开场像刚刚醒来的模糊房间，滚动时记忆碎片逐渐形成可探索空间，最后收束为记录今晚的梦。');
    expect(assets.map((asset) => asset.id)).toEqual([
      'dream-room-awakening-v1',
      'dream-memory-fragments-v1',
      'dream-night-record-v1'
    ]);
    expect(assets.map((asset) => asset.experience?.function)).toEqual(['establish', 'transform', 'resolve']);
    expect(assets.map((asset) => asset.experience?.anchor)).toEqual([.06, .52, .94]);
    expect(assets.every((asset) => asset.required && asset.source === 'chatgpt-generated')).toBe(true);
  });
});
