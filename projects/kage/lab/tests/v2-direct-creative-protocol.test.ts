import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import {
  createDirectCreativeRunFromContract,
  createDirectCreativeRunFromContractV2,
  createDirectCreativeRunFromContractV3
} from '../src/v2/direct-creative-protocol.ts';
import {
  directCreativeStageNeedsStatusReport,
  recordDirectCreativeStageReport
} from '../src/v2/direct-creative-run.ts';

describe('V2 direct creative protocol adapter', () => {
  it('compiles a relevant brief into one bounded run with positive reference evidence', () => {
    const run = createDirectCreativeRunFromContract(createV2CreativeContract(
      '为梦境记录产品设计网页。开场像刚醒来的模糊房间，滚动时同一空间逐渐清晰，最后记录今晚的梦。'
    ));

    expect(run.goalPlayback.primaryAction).toContain('记录');
    expect(run.creativeProtocolVersion).toBe(1);
    expect(run.referencePrinciples).toContainEqual(expect.objectContaining({
      referenceId: 'positive-dream-room-memory',
      sourceUri: expect.stringContaining('cases')
    }));
    expect(run.interactionRationale.mode).toBe('scroll');
    expect(run.visualAmbition).toMatchObject({
      schemaVersion: 1,
      intentLevel: 'immersive',
      heroMoment: {
        observableRuntimeChange: expect.objectContaining({
          trigger: expect.stringContaining('滚动')
        })
      }
    });
    expect(run.attemptBudget.limits).toMatchObject({
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 2,
      visualRefinements: 1
    });
  });

  it('provides explicit versioned entries without changing legacy reconstruction', () => {
    const contract = createV2CreativeContract(
      '为纸张档案设计连续编辑网页，让访客理解修复证据并预约开放日。'
    );

    expect(createDirectCreativeRunFromContract(contract).creativeProtocolVersion).toBe(1);
    expect(createDirectCreativeRunFromContractV2(contract).creativeProtocolVersion).toBe(2);
    const versionThree = createDirectCreativeRunFromContractV3(contract);
    expect(versionThree.creativeProtocolVersion).toBe(3);
    expect(versionThree.mediumDecision).toBeTruthy();
  });

  it('keeps the V3 medium, visual ambition and required asset duty consistent', () => {
    const run = createDirectCreativeRunFromContractV3(createV2CreativeContract(
      '为虚构潮间带夜巡设计沉浸网页。必须调用大模型生图生成宽幅主视觉，滚动时探索潮池，最后保存路线。'
    ));

    expect(run.mediumDecision?.preferred).toBe('generated-image');
    expect(run.visualAmbition?.rendering.primary).toBe('raster-image');
    expect(run.assetPlan.strategy).toBe('generated');
    expect(run.assetPlan.assets).toContainEqual(expect.objectContaining({
      source: 'generated',
      required: true
    }));
  });

  it('keeps an unrelated brief reference-free and does not add interaction for its own sake', () => {
    const run = createDirectCreativeRunFromContract(createV2CreativeContract(
      '为社区剧场设计一张演出季网页，让访客理解本周节目并完成购票。'
    ));

    expect(run.referencePrinciples).toEqual([]);
    expect(run.interactionRationale.mode).toBe('none');
    expect(run.visualAmbition).toMatchObject({
      schemaVersion: 1,
      intentLevel: 'restrained',
      rendering: { primary: 'dom-css' }
    });
  });

  it('requires a visible status report after sixty seconds without starting another attempt', () => {
    const run = createDirectCreativeRunFromContract(createV2CreativeContract(
      '为社区花园开放日设计明亮网页，帮助居民查看活动并完成报名。'
    ));
    expect(directCreativeStageNeedsStatusReport(59_999)).toBe(false);
    expect(directCreativeStageNeedsStatusReport(60_000)).toBe(true);

    const reported = recordDirectCreativeStageReport(run, {
      stage: 'asset-plan',
      elapsedMs: 60_000,
      status: 'progress',
      summary: '素材批次仍在处理，未发起新的生成批次。'
    });
    expect(reported.stageReports).toHaveLength(1);
    expect(reported.attemptBudget).toEqual(run.attemptBudget);
  });
});
