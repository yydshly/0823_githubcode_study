import { describe, expect, it } from 'vitest';
import { evaluateAssetQualityGate } from '../src/generation/asset-quality-gate.ts';
import { selectProjectCreativeAssets } from '../src/generation/creative-asset-catalog.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract, v2CreativeContractSchema } from '../src/v2/creative-contract.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

describe('V2 scene composition router', () => {
  it('accepts the aligned rooftop greenhouse pack as four independent layers', () => {
    const brief = '为城市屋顶温室设计清晨网页，结露玻璃、番茄藤和城市天际线产生真实视差，拖动湿度后露珠覆盖同步变化。';
    const contract = createV2CreativeContract(brief);
    const assets = selectProjectCreativeAssets(brief, 4);
    const gate = evaluateAssetQualityGate(contract, assets);

    expect(contract.technical.sceneComposition.route).toBe('layered-2d');
    expect(gate.decision).toBe('ready');
    expect(gate.acceptedAssetIds).toHaveLength(4);
    expect(new Set(gate.acceptedAssetIds).size).toBe(4);
  });

  it('keeps an ordinary product page on the existing non-blocking asset route', () => {
    const contract = createV2CreativeContract(
      '为一款智能声音产品设计安静、真实的发布网页，最后预约体验。'
    );

    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'single-image-hybrid',
      required: false,
      failurePolicy: 'continue-with-declared-fallback'
    });
    expect(contract.assets.map((asset) => asset.id)).toContain('hero-product');
    expect(contract.assets.map((asset) => asset.id)).not.toContain('scene-depth-field');
  });

  it('requires independent 2.5D layers for a stateful tree canopy environment', () => {
    const contract = createV2CreativeContract(
      '为城市树冠降温观察站设计明亮网页。滚动时同一片树冠、树荫覆盖范围和地面阴影同步变化，观察者逐渐靠近树下，最后保存降温观察。'
    );
    const summary = summarizeV2CreativeContract(contract);
    const execution = createCodexExecutionBrief(contract);

    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'layered-2d',
      required: true,
      minimumIndependentLayers: 4,
      failurePolicy: 'block-authoring'
    });
    expect(contract.assets.filter((asset) => asset.required).map((asset) => asset.id)).toEqual([
      'scene-environment', 'scene-subject', 'scene-foreground', 'scene-depth-field'
    ]);
    expect(summary.sceneCompositionRoute).toBe('layered-2d');
    expect(execution.technical.sceneComposition.route).toBe('layered-2d');
  });

  it('does not allow one trusted image to satisfy several independent layer duties', () => {
    const contract = createV2CreativeContract(
      '为城市树冠降温观察站设计明亮网页。拖动时树冠、树荫和地面阴影同步扩张，画面具有前景、中景和后景。'
    );
    const gate = evaluateAssetQualityGate(contract, [{
      id: 'canopy-flat', kind: 'environment', source: 'chatgpt-generated',
      qualityLevel: 'L4-cinematic', role: 'tree canopy', description: 'One complete tree canopy image.'
    }]);

    expect(gate.decision).toBe('needs-codex-assets');
    expect(gate.summary).toContain('同一张背景图不能重复充当');
    expect(gate.requests).toHaveLength(3);
    expect(gate.requests.map((request) => request.requirementId)).toEqual([
      'scene-subject', 'scene-foreground', 'scene-depth-field'
    ]);
  });

  it('keeps inspectable GLB work on the true spatial route', () => {
    const contract = createV2CreativeContract(
      '为声学设备设计产品网页，必须使用真实 GLB 拆解内部结构，并允许自由旋转检查。'
    );

    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'spatial-3d', required: true, fallbackRoute: 'block'
    });
  });

  it('does not add image layers on top of an existing procedural Three.js workspace', () => {
    const contract = createV2CreativeContract(
      '为陶艺学习者设计釉色实验网页，调整配方和烧成温度时，同一只茶杯的釉色与光泽同步变化。'
    );

    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'single-image-hybrid', required: false
    });
    expect(contract.assets.map((asset) => asset.id)).not.toContain('scene-depth-field');
  });

  it('does not mistake an inspectable leaf specimen for a stateful environmental canopy', () => {
    const contract = createV2CreativeContract(
      '为儿童自然教育设计植物标本观察桌。完整叶片、种子与根系持续可见，选择标本并拖动放大镜时，叶脉、含水量和生长阶段证据同步变化。'
    );

    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'single-image-hybrid',
      required: false,
      failurePolicy: 'continue-with-declared-fallback'
    });
    expect(contract.assets.filter((asset) => asset.required).map((asset) => asset.id))
      .toEqual(['botanical-specimen-field']);
    expect(contract.assets.map((asset) => asset.id)).not.toContain('scene-depth-field');
  });

  it('requires bounded 2.5D duties for a grounded physical direct-manipulation workspace', () => {
    const contract = createV2CreativeContract(
      '为小户型设计今日晾晒工作区。真实城市阳台、同一根绳索、栏杆和四件衣物持续存在；拖动衣物改变位置时，绳索下垂、日照覆盖、阴影和预计干燥时间在同一空间同步变化，最后生成收衣顺序。'
    );

    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'layered-2d',
      required: true,
      requiredLayers: ['environment', 'subject', 'foreground', 'shadow-mask'],
      minimumIndependentLayers: 4,
      failurePolicy: 'block-authoring'
    });
    expect(contract.technical.sceneComposition.requiredLayers.length).toBeLessThanOrEqual(4);
    expect(contract.direction.renderer.route).toBe('dom-canvas-hybrid');
    expect(contract.direction.renderer.route).not.toBe('dom-three-hybrid');
    expect(evaluateAssetQualityGate(contract, []).decision).toBe('needs-codex-assets');
  });

  it('keeps abstract book-card reordering out of the physical scene route', () => {
    const contract = createV2CreativeContract(
      '为读者设计选书工作台。拖动书封、书卡和引文卡进行重排，推荐清单同步更新，最后保存书单。'
    );

    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'single-image-hybrid',
      required: false
    });
    expect(contract.technical.sceneComposition.requiredLayers).toEqual(['environment']);
  });

  it('parses an older stored contract without changing its behavior', () => {
    const current = createV2CreativeContract(
      '为社区花园开放日设计明亮、亲切的网页，帮助居民查看活动并完成报名。'
    );
    const legacy = structuredClone(current) as unknown as Record<string, unknown>;
    const technical = legacy.technical as Record<string, unknown>;
    delete technical.sceneComposition;

    const parsed = v2CreativeContractSchema.parse(legacy);
    expect(parsed.technical.sceneComposition).toMatchObject({
      route: 'single-image-hybrid', required: false
    });
  });
});
