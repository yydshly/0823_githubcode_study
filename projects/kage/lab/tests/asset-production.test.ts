import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateAssets, readGeneratedAsset } from '../server/asset-generator';
import { compileAssetPrompt } from '../src/generation/asset-production';
import { assertEffectSpec, type EffectSpec } from '../src/generation/effect-spec';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function effectSpec(): EffectSpec {
  return assertEffectSpec({
    schemaVersion: 1, id: 'effect-sound-object', title: '声之器', thesis: '把智能声音产品塑造成清冷但可信的空间记忆。', route: 'immersive-page',
    goal: { subject: '智能声音产品', audience: '独立创作者', desiredOutcome: '建立产品质感并让访客理解声音塑形能力。', primaryAction: '申请体验' },
    direction: { signatureMoment: '玻璃声学主体从暗场中显现，内部声纹在一次稳定停留中被看清。', spatialMetaphor: '被凝固的声音容器', visualGrammar: ['烟黑玻璃', '冰蓝声纹', '克制留白'], moodArc: ['静默', '共振', '清晰'], palette: { deep: '#05090d', surface: '#0d171d', text: '#edf7f8', muted: '#87979d', accent: '#7ddff2', accentSoft: '#e5b672' } },
    composition: { mode: 'hybrid-2.5d', domRole: '承载产品价值、阅读内容和行动入口。', webglRole: '承载产品主视觉、空间视差和共振氛围。', layers: [
      { id: 'semantic-content', role: 'content', purpose: '提供完整可读的产品信息和行动路径。', techniques: ['dom-layout'], assetRequirementIds: [], visibleOutcome: '关闭 WebGL 后仍能理解完整产品信息。' },
      { id: 'hero-world', role: 'world', purpose: '建立产品可信质感与空间记忆点。', techniques: ['image-plane', 'shader'], assetRequirementIds: ['hero-image'], visibleOutcome: '产品主视觉占据右侧，左侧保留标题空间。' }
    ] },
    motion: { pace: 'calm', cameraStrategy: '先以远景建立产品轮廓，再轻微靠近内部声纹并稳定停留。', drivers: ['scroll', 'pointer'], reducedMotion: '保留稳定英雄构图并移除连续视差。' },
    assetRequirements: [{
      id: 'hero-image', role: 'subject', modality: 'image', purpose: '承担智能声音产品的可信外观、材质和主构图。', required: true,
      minimumQuality: 'L3-presentable', fidelity: 'recognizable', fallback: 'block',
      experience: {
        anchor: .12, function: 'establish', visualState: '产品主体在暗场中形成唯一清晰焦点。',
        continuity: '主体的冰蓝声纹会延续为后续空间中的声音轨迹。', integration: 'alpha-subject'
      }
    }],
    constraints: { targetDevices: ['desktop', 'mobile'], qualityIntent: 'presentable', targetFrameTimeMs: 16.7, maxInitialAssetBytes: 4_000_000 },
    reasoning: ['真实主视觉负责质量，Three.js 负责空间和互动。'],
    provenance: { source: 'model', providerId: 'codex:gpt-test', model: 'gpt-test', briefHash: 'brief' }
  });
}

describe('asset production adapter', () => {
  it('compiles a bounded asset prompt from the model-owned EffectSpec', () => {
    const spec = effectSpec();
    const prompt = compileAssetPrompt('为独立创作者设计智能声音产品发布页。', spec, spec.assetRequirements[0]);
    expect(prompt).toContain('智能声音产品');
    expect(prompt).toContain('玻璃声学主体');
    expect(prompt).toContain('Experience anchor: 0.12');
    expect(prompt).toContain('extraction-friendly subject');
    expect(prompt).toContain('冰蓝声纹');
    expect(prompt).toContain('No text');
    expect(prompt.length).toBeLessThanOrEqual(1500);
  });

  it('materializes, validates and reuses a MiniMax image response', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-asset-test-'));
    roots.push(root);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]);
    let calls = 0;
    const fetchMock: typeof fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ data: { image_base64: [jpeg.toString('base64')] }, base_resp: { status_code: 0, status_msg: 'success' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const request = { schemaVersion: 1 as const, provider: 'minimax' as const, brief: '为独立创作者设计智能声音产品发布页。', effectSpec: effectSpec(), seed: 17 };
    const first = await generateAssets(request, { MINIMAX_API_KEY: 'test', SIGNAL_ASSET_CACHE_DIR: root }, fetchMock);
    expect(first).toMatchObject({ status: 'ready', cache: { hits: 0, misses: 1 }, assets: [expect.objectContaining({ qualityLevel: 'L2-inspectable', publishable: false })] });
    const served = await readGeneratedAsset(first.assets[0].uri.split('/').at(-1)!, { SIGNAL_ASSET_CACHE_DIR: root });
    expect(served?.contentType).toBe('image/jpeg');
    expect(served?.bytes).toEqual(jpeg);
    const second = await generateAssets(request, { MINIMAX_API_KEY: 'test', SIGNAL_ASSET_CACHE_DIR: root }, fetchMock);
    expect(second.cache).toEqual({ hits: 1, misses: 0 });
    expect(calls).toBe(1);
    expect(JSON.parse(await readFile(join(root, `${first.assets[0].uri.split('/').at(-1)}.json`), 'utf8'))).toMatchObject({ candidate: { requirementId: 'hero-image' } });
  });

  it('does not pretend Codex or an unconfigured MiniMax key can emit image bytes', async () => {
    await expect(generateAssets({ schemaVersion: 1, provider: 'minimax', brief: '为独立创作者设计智能声音产品发布页。', effectSpec: effectSpec(), seed: 17 }, {})).rejects.toThrow(/MINIMAX_API_KEY/);
  });
});
