import { describe, expect, it } from 'vitest';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';
import { hasExplicitSpatialInspectionIntent } from '../src/v2/style-diversity.ts';

export const modularRoomSoundBrief = '为一款可分体的客厅音响设计产品网页。访客可以自由旋转检查同一套音频设备，并在横置、左右分体和壁挂之间切换；箱体、扬声单元、低音腔、连接触点和挂扣必须按真实装配关系重新就位。开启剖视后，访客要能沿声音通路看清每个单元与腔体怎样连接，并试听当前组合对应的程序化声音片段。最终行动是保存这套组合并预约试听。页面中的产品、声路和试听均为概念设计演示，不代表真实产品参数。';

describe('R142 ordinary spatial-responsibility probe', () => {
  it('selects Three.js because the ordinary brief requires inspectable topology, not because it names a renderer', () => {
    const contract = createV2CreativeContract(modularRoomSoundBrief);
    const execution = createCodexExecutionBrief(contract);
    const authorPackage = createDirectCreativeAuthorPackage(contract);

    expect(modularRoomSoundBrief).not.toMatch(/Three\.js|WebGL|3D|GLB|gltf/i);
    expect(hasExplicitSpatialInspectionIntent(modularRoomSoundBrief)).toBe(false);
    expect(contract.intent).toMatchObject({
      subject: '可分体的客厅音响',
      primaryAction: '保存这套组合并预约试听',
    });
    expect(contract.experience).toMatchObject({
      pattern: 'product-atmosphere',
      structure: { mode: 'guided-sequence' },
    });
    expect(contract.technical.stateAssetStrategy).toMatchObject({
      required: true,
      route: 'inspectable-model',
      changeKind: 'assembly',
      minimumDistinctStates: 3,
      minimumPartGroups: 5,
      failurePolicy: 'block-authoring',
    });
    expect(contract.technical.spatialProductTopology).toMatchObject({
      selected: true,
      capabilityId: 'spatial-product-topology',
      blockers: [],
      evidence: {
        physicalProduct: true,
        persistentIdentity: true,
        poseLabels: ['横置', '左右分体', '壁挂'],
        distinctPoseCount: 3,
        topologyRepositioning: true,
        inspectionModes: ['orbit', 'cutaway'],
      },
      authoringContract: {
        stateModel: 'single-persistent-assembly-tree',
        minimumDistinctPoses: 3,
        minimumNamedPartGroups: 5,
        transitionPolicy: 'reuse-nodes-transform-only',
        rendererRoute: 'dom-three-hybrid',
      },
    });
    expect(contract.technical.spatialProductTopology.evidence.namedPartGroups).toEqual(
      expect.arrayContaining(['箱体', '扬声单元', '低音腔', '连接触点', '挂扣'])
    );
    expect(contract.technical.sceneComposition).toMatchObject({
      required: true,
      route: 'spatial-3d',
      stateBinding: 'material-or-geometry',
      failurePolicy: 'block-authoring',
    });
    expect(execution.mediumDecision).toMatchObject({
      preferred: 'threejs-spatial',
      confidence: 0.98,
      assetResponsibilities: [expect.objectContaining({
        id: 'hero-product',
        source: 'model-3d',
        required: true,
      })],
    });
    expect(execution.mediumDecision.signals).toContainEqual(expect.objectContaining({
      source: 'contract-evidence',
      evidence: expect.stringMatching(/同一实体产品|装配树|具名部件/),
    }));
    expect(execution.mediumDecision.truthBoundary).toMatch(/概念设计演示.*真实产品参数|声学测量/);
    expect(execution.technical.selectedCapabilities).toContain('spatial-product-topology');
    expect(execution.technical.spatialProductTopology).toEqual(
      contract.technical.spatialProductTopology.authoringContract
    );
    expect(contract.acceptance).toContainEqual(expect.objectContaining({
      id: 'spatial-topology-evidence',
      priority: 'blocker',
    }));
    expect(execution.visualAmbition.rendering.primary).toBe('threejs-3d');
    expect(authorPackage.authoringInput.references.map((reference) => reference.id)).toEqual([
      'positive-smart-audio-anchor',
      'positive-sonic-editorial-feedback',
    ]);
    expect(authorPackage.runSeed).toMatchObject({
      creativeProtocolVersion: 3,
      assetStrategy: 'generated',
      interaction: { mode: 'direct', audioApplicable: true },
    });

    expect(contract.instructions.filter((instruction) => instruction.strength === 'hard')
      .every((instruction) => instruction.source === 'user' || instruction.source === 'quality'))
      .toBe(true);
    expect(contract.instructions.filter((instruction) => instruction.source === 'reference')
      .every((instruction) => instruction.strength === 'advisory'))
      .toBe(true);
  });

  it('does not choose Three.js for the same product category without spatial responsibility', () => {
    const contract = createV2CreativeContract(
      '为一款客厅音响设计简洁的新品介绍页，说明颜色、价格、配送和售后，最终行动是订阅到货提醒。'
    );
    const execution = createCodexExecutionBrief(contract);

    expect(contract.intent.subject).toContain('客厅音响');
    expect(contract.technical.sceneComposition.route).not.toBe('spatial-3d');
    expect(contract.technical.stateAssetStrategy.route).not.toBe('inspectable-model');
    expect(execution.mediumDecision.preferred).not.toBe('threejs-spatial');
  });
});
