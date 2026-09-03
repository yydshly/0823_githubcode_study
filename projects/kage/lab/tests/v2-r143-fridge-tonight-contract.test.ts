import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCodexExecutionBrief, serializeCodexAuthoringBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';

export const fridgeTonightBrief = '为一款帮助独居者在食材过期前安排今晚晚餐的产品设计网页。开场像一扇明亮的冰箱门，现有食材以带日期的编辑插画切片和磁贴出现。访客选择二到四样食材后，新鲜度时间带、今晚可做的菜和仍需补买的项目要在同一页同步重排；取消选择时结果即时撤回。最终行动是保存今晚清单。所有食材、日期和建议都是概念演示。页面像一本厨房杂志与手写便签的结合，不做参数工作台，也不按固定屏数排版。';

describe('R143 non-spatial ordinary-product regression', () => {
  it('selects a code-native editorial route from content responsibility without a user Three.js ban', () => {
    const contract = createV2CreativeContract(fridgeTonightBrief);
    const execution = createCodexExecutionBrief(contract);
    const authoring = JSON.parse(serializeCodexAuthoringBrief(contract)) as Record<string, unknown>;
    const run = createDirectCreativeRunFromContractV3(contract);

    expect(fridgeTonightBrief).not.toMatch(/Three\.js|WebGL|Canvas|3D|GLB|gltf/i);
    expect(contract.intent.primaryAction).toBe('保存今晚清单');
    expect(contract.experience).toMatchObject({
      pattern: 'editorial-field',
      structure: { mode: 'editorial-flow', segmentPolicy: 'content-derived' },
    });
    expect(contract.technical.stateAssetStrategy).toMatchObject({
      required: false,
      route: 'static-sufficient',
      changeKind: 'none',
    });
    expect(contract.technical.sceneComposition).toMatchObject({
      required: false,
      route: 'single-image-hybrid',
    });
    expect(contract.technical.spatialProductTopology).toMatchObject({
      selected: false,
      capabilityId: null,
    });
    expect(contract.direction.renderer.route).toBe('dom-only');
    expect(execution.mediumDecision).toMatchObject({
      preferred: 'code-native',
      assetResponsibilities: [],
      alternative: null,
    });
    expect(execution.visualAmbition.rendering).toMatchObject({ primary: 'dom-css' });
    expect(execution.technical.selectedCapabilities).not.toContain('spatial-product-topology');
    expect(JSON.stringify(authoring)).not.toMatch(/threejs-spatial|threejs-3d|spatial-product-topology/);
    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      assetPlan: { strategy: 'none', assets: [] },
      interactionRationale: { mode: 'direct', audioApplicable: false },
    });

    const hardText = execution.instructions.hard.map((instruction) => instruction.content).join('。');
    expect(hardText).not.toMatch(/Three\.js|WebGL|Canvas|3D|GLB|gltf/i);
    expect(contract.technical.styleDiversity.structureDirection.workbenchPolicy).toBe('forbidden');
  });

  it('records a bounded editorial-flow contract instead of a disguised workspace template', () => {
    const contractFile = readFileSync(
      new URL('../pages/v2/deliveries/fridge-tonight/CONTRACT.md', import.meta.url),
      'utf8',
    );

    expect(contractFile).toContain('Experience architecture: Editorial Flow');
    expect(contractFile).toContain('素材批次：0 / 1');
    expect(contractFile).toContain('选择 2–4 样食材');
    expect(contractFile).toContain('390×844');
    expect(contractFile).toContain('脚本不可用时仍有可读食材');
    expect(contractFile).toContain('用户没有禁止 Three.js');
    expect(contractFile).toContain('不得为了“再好一点”新增第二方向');
  });
});
