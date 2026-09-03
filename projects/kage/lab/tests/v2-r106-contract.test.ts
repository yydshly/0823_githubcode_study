import { describe, expect, it } from 'vitest';
import { evaluateAssetQualityGate } from '../src/generation/asset-quality-gate.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { serializeCodexAuthoringBrief } from '../src/v2/codex-execution-brief.ts';
import { classifyInteractionTaskShape } from '../src/v2/interaction-task-shape.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

const brief = '为住在小户型、只有一处窄阳台的人设计今日晾晒编排网页。主工作区是一座被上午自然光照亮的真实城市阳台：同一根晾衣绳、遮雨檐、栏杆和四件可辨认衣物——厚浴巾、衬衫、针织衫、床单——持续存在。用户直接拖动或用触摸、键盘把衣物挂到直晒、半阴或檐下位置；移动任何一件时，这件衣物的真实位置、绳索下垂、日照覆盖和预计干燥时间要在同一阳台同步变化，过重位置给出容易理解的视觉提示。用户可以切换上午/午后，查看阴影在同一空间内移动，最后行动是生成今天的收衣顺序。画面像清爽的家居杂志与洗衣护理标签结合，使用天空蓝、亚麻白、衣物原色和少量陶土色；不要暗色科技、中央孤立产品、巨型标题、随机粒子、左控中图右指标的固定三栏或固定三屏。素材来源与渲染方式不限，以阳台空间可信、衣物可识别、交互因果清楚和最终视觉质量为准。';

describe('V2 R106 balcony drying validation contract', () => {
  it('locks the new theme to a bright direct-manipulation workspace before creating a job', () => {
    const contract = createV2CreativeContract(brief);
    const style = contract.technical.styleDiversity;
    const summary = summarizeV2CreativeContract(contract);
    const authoring = JSON.parse(serializeCodexAuthoringBrief(contract));

    expect(brief.length).toBeLessThanOrEqual(600);
    expect(classifyInteractionTaskShape(brief).kind).toBe('grounded-physical-manipulation');
    expect(contract.intent.subject).toBe('今日晾晒编排');
    expect(contract.intent.subject).not.toContain('的人');
    expect(style.nearestDistance).toBeGreaterThanOrEqual(0);
    expect(style.minimumDifferentAxes).toBe(0);
    expect(style.mustDifferOn).toEqual([]);
    expect(style.rankingOnly).toBe(true);
    expect(style.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      workbenchPolicy: 'allowed',
      strength: 'advisory'
    });
    expect(contract.experience.pattern).toBe('editorial-field');
    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'workbench-baseline', 'causal-response', 'result-ready'
    ]);
    expect(contract.experience.thesis).toContain('可直接操作的持续工作区');
    expect(contract.experience.pointerRole).toContain('同步改变可见状态、业务结果');
    expect(contract.experience.reducedMotion).toContain('保留全部控制、结果和最终行动');
    expect(summary.structureMode).toBe('interactive-field');
    expect(authoring.story.structure.mode).toBe('interactive-field');
    expect(authoring.story.beats.map((beat: { id: string }) => beat.id)).toEqual([
      'workbench-baseline', 'causal-response', 'result-ready'
    ]);
    expect(authoring.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      workbenchPolicy: 'allowed',
      strength: 'advisory'
    });
    expect(contract.direction.interaction.primaryInput).toBe('pointer');
    expect(contract.direction.interaction.semanticAction).toContain('direct-manipulation');
    expect(contract.direction.interaction.semanticAction).toContain('位置、占用关系与业务结果同步变化');
    expect(contract.direction.interaction.touchAlternative).not.toMatch(/放入|取出/);
    expect(contract.direction.interaction.keyboardAlternative).toContain('方向键');
    expect(contract.direction.interaction.keyboardAlternative).toContain('Enter');
    expect(contract.direction.interaction.keyboardAlternative).toContain('Escape');
    expect(contract.direction.interaction.keyboardAlternative).not.toMatch(/放入|取出/);
    expect(contract.technical.sceneComposition).toMatchObject({
      route: 'layered-2d',
      required: true,
      requiredLayers: ['environment', 'subject', 'foreground', 'shadow-mask'],
      failurePolicy: 'block-authoring'
    });
    expect(contract.direction.renderer.route).toBe('dom-canvas-hybrid');
    expect(contract.assets.filter((asset) => asset.required).map((asset) => asset.id)).toEqual([
      'scene-environment', 'scene-subject', 'scene-foreground', 'scene-shadow-mask'
    ]);
    expect(contract.assets.map((asset) => asset.id)).not.toContain('scene-depth-field');
    expect(contract.visualAnchor.subject).toContain('真实城市阳台');
    expect(contract.visualAnchor.subject).toContain('衣物');
    expect(evaluateAssetQualityGate(contract, []).decision).toBe('needs-codex-assets');
    expect(authoring.authoring.primaryJourney.operation).toContain('拖动');
    expect(authoring.authoring.primaryJourney.visibleSubjectDelta).toContain('绳索下垂');
    expect(authoring.authoring.primaryJourney.visibleSubjectDelta).toContain('日照覆盖');
    expect(authoring.authoring.primaryJourney.visibleSubjectDelta).not.toContain('用户直接拖动');
    expect(authoring.authoring.primaryJourney.businessResult).toContain('预计干燥时间');
    expect(authoring.authoring.primaryJourney.businessResult).toContain('视觉提示');
    expect(authoring.authoring.primaryJourney.operation).not.toBe(authoring.authoring.primaryJourney.visibleSubjectDelta);
    expect(style.fingerprint.palette).toBe('daylight-neutral');
    expect(style.fingerprint.composition).not.toBe('full-bleed-cinematic');
  });

  it('does not rewrite map, archive or continuous-stage structures', () => {
    const map = createV2CreativeContract(
      '为城市公共饮水点设计明亮地图，选择站点后更新路线、距离和开放状态。'
    );
    const archive = createV2CreativeContract(
      '为消失的老电影院制作数字档案，以票根、年代、立面和口述证据组织阅读。'
    );
    const dream = createV2CreativeContract(
      '为帮助人记录梦境的产品设计网页，滚动时同一房间从模糊逐渐形成可探索记忆，最后记录今晚的梦。'
    );

    expect(map.technical.styleDiversity.structureDirection.experienceForm).toBe('spatial-atlas');
    expect(map.experience.structure.mode).toBe('interactive-field');
    expect(archive.technical.styleDiversity.structureDirection.experienceForm).toBe('editorial-evidence');
    expect(archive.experience.structure.mode).toBe('editorial-flow');
    expect(dream.technical.styleDiversity.structureDirection.experienceForm).toBe('continuous-stage');
    expect(dream.experience.structure.mode).toBe('continuous-canvas');
  });
});
