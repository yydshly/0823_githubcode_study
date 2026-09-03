import { describe, expect, it } from 'vitest';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import {
  createDirectCreativeAuthorPackage,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';
import { createDirectCreativeRunFromContractV2 } from '../src/v2/direct-creative-protocol.ts';

const unseenForestSoundBrief = [
  '为儿童自然博物馆设计“声音藏在哪里”互动网页；',
  '在明亮森林剖面中点击叶片、树洞、溪石或昆虫，播放对应自然声音，声源位置、波纹和观察提示同步出现；',
  '收集三个后形成聆听路线并保存。',
  '不要暗色科技、卡片目录或固定三屏。'
].join('');

describe('R130 unseen brief decision proof', () => {
  it('selects a bounded SVG object field instead of a map, product hero or shader workspace', () => {
    const contract = createV2CreativeContract(unseenForestSoundBrief);
    const execution = createCodexExecutionBrief(contract);
    const run = createDirectCreativeRunFromContractV2(contract);

    expect(contract.intent).toMatchObject({
      subject: '声音藏在哪里',
      audience: '需要快速理解并感受该想法的网页访客',
      primaryAction: '保存当前结果'
    });
    expect(contract.experience.structure.mode).toBe('single-scene');
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'object-field',
      workbenchPolicy: 'forbidden',
      controlVisibility: 'contextual',
      interactionStyle: 'pointer'
    });
    expect(contract.direction).toMatchObject({
      visualRole: 'subject',
      interaction: { primaryInput: 'pointer', pointerRole: 'primary' },
      renderer: { route: 'dom-only', enhancement: 'none' }
    });
    expect(contract.technical.placeGrounding).toMatchObject({
      strategy: 'place-atmosphere',
      requirements: { map: 'avoid' }
    });
    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'single-image-hybrid',
      required: false
    });
    expect(execution.visualAmbition).toMatchObject({
      rendering: { primary: 'svg' },
      spatialDepth: { mode: 'layered-2d' },
      assetCredibility: { level: 'conceptual-coherent' }
    });
    expect(run.interactionRationale).toMatchObject({ mode: 'direct', audioApplicable: true });
  });

  it('recognizes visible click causality and sourced audio playback as one product state', () => {
    const contract = createV2CreativeContract(unseenForestSoundBrief);

    expect(contract.technical.semanticInteraction).toMatchObject({
      selected: true,
      capabilityId: 'semantic-responsive-interaction'
    });
    expect(contract.technical.productSemanticFeedback).toMatchObject({
      selected: true,
      authoringContract: {
        route: 'audio-asset-playback',
        stateBinding: 'same-causal-state-as-visual-result'
      }
    });
  });

  it('delivers goal, direction and complete asset duties directly to the bounded author package', () => {
    const authorPackage = createDirectCreativeAuthorPackage(
      createV2CreativeContract(unseenForestSoundBrief)
    );
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(authorPackage.authoringInput.goal).toMatchObject({
      subject: '声音藏在哪里',
      action: '保存当前结果'
    });
    expect(authorPackage.authoringInput.direction.renderer.reason).toContain('内联 SVG');
    expect(authorPackage.authoringInput.assets).toContainEqual(expect.objectContaining({
      id: 'object-field-subjects',
      modality: 'procedural',
      sourcePriority: ['procedural'],
      responsibility: expect.stringContaining('对象集合'),
      continuity: expect.stringContaining('共享空间坐标'),
      proof: expect.stringContaining('指针、触摸或键盘选择')
    }));
    expect(authorPackage.runSeed.interaction).toMatchObject({ mode: 'direct', audioApplicable: true });
    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThan(30 * 1024);
    expect(authorPackage.timing.silentRetries).toBe(0);
  });

  it('keeps a real public-service map and an explicit spatial journey on their existing routes', () => {
    const map = createV2CreativeContract(
      '为城市公共饮水点设计地图，选择站点时更新水质、步行距离和开放状态，找到最近的饮水点。'
    );
    const spatial = createV2CreativeContract(
      '为普通访客设计冰芯来信网页。向下滚动依次穿过同一冰芯的气泡、火山灰与花粉层，形成有深度的空间旅程，最后写一封给未来的信。'
    );

    expect(map.technical.placeGrounding).toMatchObject({
      strategy: 'real-geography-evidence',
      requirements: { map: 'required' }
    });
    expect(createCodexExecutionBrief(map).visualAmbition.assetCredibility.level).toBe('data-grounded');
    expect(spatial.experience).toMatchObject({
      pattern: 'continuous-scroll',
      structure: { mode: 'continuous-canvas' }
    });
    expect(spatial.technical.styleDiversity.structureDirection.experienceForm).toBe('continuous-stage');
  });
});
