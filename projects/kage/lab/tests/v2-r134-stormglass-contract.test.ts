import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';

export const stormglassBrief = '为一座收集雷雨余光的虚构气象档案馆设计沉浸网页。开场铅灰云层中悬浮一片风暴玻璃；滚动时电荷沿玻璃裂隙汇聚，闪电余辉从冷灰逐渐凝成电白拓片，最终行动为“保存这次闪电拓片”。使用实时 WebGL 程序化光场，让滚动真实驱动电荷、裂隙亮度和玻璃折射；不是参数工作台，不要滑杆、卡片目录或固定三段。结果是艺术化模拟，不冒充真实气象测量。';

describe('R134 stormglass V3 contract', () => {
  it('selects one bounded WebGL procedural route and binds it to the author package', () => {
    const contract = createV2CreativeContract(stormglassBrief);
    const execution = createCodexExecutionBrief(contract);
    const run = createDirectCreativeRunFromContractV3(contract);
    const authorPackage = createDirectCreativeAuthorPackage(contract);

    expect(execution.mediumDecision).toMatchObject({
      preferred: 'webgl-procedural',
      assetResponsibilities: [expect.objectContaining({
        source: 'programmatic',
        required: true,
      })],
    });
    expect(execution.visualAmbition).toMatchObject({
      rendering: { primary: 'webgl-shader' },
    });
    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      assetPlan: { strategy: 'programmatic' },
      interactionRationale: { mode: 'scroll' },
    });
    expect(run.mediumDecision).toEqual(execution.mediumDecision);
    expect(authorPackage).toMatchObject({
      contractId: contract.id,
      authoringInput: {
        exactBrief: stormglassBrief,
        mediumDecision: execution.mediumDecision,
      },
      runSeed: {
        id: run.id,
        creativeProtocolVersion: 3,
        assetStrategy: 'programmatic',
      },
      evidenceRequirements: {
        identityBinding: 'runId+bundleHash',
        profile: {
          interactionMode: 'scroll',
          requiredCheckpoints: ['opening', 'core', 'mobile', 'scroll'],
        },
      },
    });
  });

  it('keeps the user prohibitions local without inventing a project-wide style ban', () => {
    const contract = createV2CreativeContract(stormglassBrief);
    const hard = contract.instructions.filter((instruction) => instruction.strength === 'hard');
    const userHard = hard.filter((instruction) => instruction.source === 'user');
    const qualityHard = hard.filter((instruction) => instruction.source === 'quality');

    expect(userHard.length).toBeGreaterThan(0);
    expect(userHard.every((instruction) => instruction.scope === 'current-run')).toBe(true);
    expect(qualityHard.length).toBeGreaterThan(0);
    expect(qualityHard.every((instruction) => (
      instruction.scope === 'project-quality'
    ))).toBe(true);
    expect(JSON.stringify(userHard)).not.toMatch(/全局|project-quality/);
  });
});
