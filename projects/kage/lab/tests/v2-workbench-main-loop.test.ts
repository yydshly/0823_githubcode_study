import { describe, expect, it } from 'vitest';
import { dedicatedCodePrompt, dedicatedCodeRequestSchema } from '../server/dedicated-code-service.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';
import { serializeCodexAuthoringBrief, serializeCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';

const dreamBrief = '为一款帮助人记录梦境的产品设计网页。开场像刚醒来的模糊房间，滚动时记忆碎片逐渐形成可探索空间，最后收束为记录今晚的梦。';

describe('V2 workbench main generation loop', () => {
  it('surfaces the shared-state driver when a brief explicitly requests demo, wheel and manual control', () => {
    const summary = summarizeV2CreativeContract(createV2CreativeContract(
      '为候鸟风洞设计教学模拟网页，提供自动演示，鼠标滚轮与三个参数滑块驱动同一飞行状态，手动操作停止演示，最后保存观察。'
    ));

    expect(summary.capabilityIds).toContain('shared-state-interaction-driver');
    expect(summary.capabilityLabels).toContain('共享状态驱动');
    expect(summary.reviewModes).toContain('shared-state-driver');
  });

  it('turns a brief into a compact, visible and bounded contract summary', () => {
    const summary = summarizeV2CreativeContract(createV2CreativeContract(dreamBrief), 4.26);
    expect(summary.pattern).toBe('environmental-memory');
    expect(summary.capabilityIds).toContain('media-scroll-scrub');
    expect(summary.referenceIds.length).toBeGreaterThan(0);
    expect(summary.preparedMs).toBe(4.3);
    expect(summary.authoringPasses).toBe(1);
    expect(summary.structureMode).toBe('continuous-canvas');
    expect(summary.storyBeatCount).toBe(4);
    expect(summary.reviewCheckpointCount).toBe(7); // 4 desktop states + mobile opening/middle/final.
    expect(summary.referenceReasons.length).toBeGreaterThan(0);
    expect(summary.capabilityReasons.length).toBeGreaterThan(0);
    expect(summary.reviewModes).toEqual(expect.arrayContaining(['story-beats', 'mobile-reduced-motion', 'primary-causality']));
    expect(summary.stateAssetRoute).toBe('static-sufficient');
    expect(summary.styleSignature.split(' · ')).toHaveLength(6);
    expect(summary.styleDifference).toContain('仅作候选排序');
    expect(summary.styleDifference).toContain('结构：连续叙事场');
    expect(summary.styleDifference).toContain('工作台可选');
    expect(summary.stopAfterMinutes).toBeLessThanOrEqual(15);
  });

  it('places the compact V2 execution brief inside the Codex authoring boundary', () => {
    const creativeContract = createV2CreativeContract(dreamBrief);
    const request = dedicatedCodeRequestSchema.parse({
      brief: dreamBrief,
      seed: 43,
      quality: 'high',
      runId: 'run-v2-main-loop',
      selectedId: 'candidate-v2-main-loop',
      creativeContract,
      reference: {
        title: '梦境记录',
        summary: '从朦胧房间形成可记录的记忆空间。',
        scenePlugin: 'composed-world',
        productionStatus: 'ready',
        assets: []
      }
    });
    const prompt = dedicatedCodePrompt(request, '');
    expect(prompt).toContain('V2 Codex 执行包');
    expect(prompt).toContain(creativeContract.id);
    expect(prompt).toContain('technical.selectedCapabilities');
    expect(prompt).toContain(creativeContract.direction.renderer.route);
    expect(prompt).toContain('story.visualAnchor 是阻断级首屏合同');
    expect(prompt).toContain('不得为了使用某种技术而预先排除其他手段');
    expect(prompt).toContain('圆柱、蛋形、球体或圆环拼接只算草模');
    expect(prompt).toContain('通用网格');
    expect(prompt).toContain('只创作一个候选');
    expect(prompt).toContain('instructions.hard 是当前任务唯一创意硬约束');
    expect(prompt).toContain('technical.styleDiversity 只用于发现模板惯性和辅助排序');
    expect(prompt).not.toContain('technical.styleDiversity.structureDirection 是业务结构硬约束');
    expect(prompt).toContain(creativeContract.technical.styleDiversity.structureDirection.experienceForm);
    expect(prompt).toContain('源码总量目标不超过 40 KB');
    expect(prompt).toContain('createGeneratedThreeRuntime');
    expect(prompt).not.toContain('sourceCaseIds');
    expect(Buffer.byteLength(serializeCodexAuthoringBrief(creativeContract), 'utf8'))
      .toBeLessThan(Buffer.byteLength(serializeCodexExecutionBrief(creativeContract), 'utf8') * .72);
  });

  it('shows the selected regional expression strategy instead of a generic map label', () => {
    const evidenceSummary = summarizeV2CreativeContract(createV2CreativeContract(
      '为城市公共饮水点设计地图，选择站点时更新水质、距离和开放状态。'
    ));
    const narrativeSummary = summarizeV2CreativeContract(createV2CreativeContract(
      '为城市逐渐消失的老电影院制作数字档案，沿街区发现不同时期的影院记忆。'
    ));

    expect(evidenceSummary.capabilityLabels).toContain('真实地域证据');
    expect(evidenceSummary.capabilityIds).toContain('place-grounded-experience');
    expect(narrativeSummary.capabilityLabels).toContain('地域空间叙事');
  });

  it('shows a selected procedural articulated subject in the workbench summary', () => {
    const summary = summarizeV2CreativeContract(createV2CreativeContract(
      '为一枚抽象机械罗盘设计网页。滚动时外环、翼片、核心与骨架逐层展开并完成校准，不要真实产品冒充。'
    ));

    expect(summary.capabilityIds).toContain('procedural-articulated-subject');
    expect(summary.capabilityLabels).toContain('程序化关节主体');
  });

  it('uses an explicitly described opening paper as a procedural material subject', () => {
    const contract = createV2CreativeContract(
      '为一间日光木版套印工坊设计沉浸式预约网页。开场是一张悬浮在木桌上、尚未落墨的和纸；滚动时木版纹理、靛蓝墨层与朱红套色依次压下，最后形成完整版画。画面温暖、手工，不要暗色科技风。'
    );

    expect(contract.intent.subject).toBe('悬浮在木桌上、尚未落墨的和纸');
    expect(contract.experience.pattern).toBe('material-transformation');
    expect(contract.visualAnchor.source).toBe('procedural');
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'procedural-material-subject',
      modality: 'procedural',
      required: true
    }));
    expect(contract.acceptance.some((item) => item.id === 'asset-visible')).toBe(false);
  });
});
