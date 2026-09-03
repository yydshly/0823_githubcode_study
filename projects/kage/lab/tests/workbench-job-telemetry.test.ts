import { describe, expect, it } from 'vitest';
import { formatWorkbenchDuration, summarizeWorkbenchJobTelemetry, summarizeWorkbenchResult } from '../src/workbench-job-telemetry.ts';

const at = (seconds: number) => new Date(Date.UTC(2026, 7, 27, 0, 0, seconds)).toISOString();

describe('workbench job telemetry', () => {
  it('derives real phase durations from persisted history', () => {
    const telemetry = summarizeWorkbenchJobTelemetry({
      status: 'complete',
      stage: 'complete',
      message: '最终网页已完成。',
      createdAt: at(0),
      updatedAt: at(54),
      finishedAt: at(54),
      history: [
        { stage: 'planning', at: at(0), message: '规划' },
        { stage: 'assets', at: at(4), message: '素材' },
        { stage: 'authoring', at: at(10), message: '构建' },
        { stage: 'reviewing', at: at(38), message: '验收' },
        { stage: 'refining', at: at(46), message: '精修' },
        { stage: 'complete', at: at(54), message: '完成' }
      ]
    }, Date.parse(at(60)));
    expect(telemetry.elapsedMs).toBe(54_000);
    expect(telemetry.phases.map((phase) => [phase.phase, phase.durationMs])).toEqual([
      ['planning', 4_000], ['assets', 6_000], ['authoring', 28_000], ['reviewing', 16_000]
    ]);
    expect(telemetry.bottleneck?.phase).toBe('authoring');
    expect(telemetry.phases.every((phase) => phase.state === 'done')).toBe(true);
  });

  it('keeps the current stage live without inventing completion', () => {
    const telemetry = summarizeWorkbenchJobTelemetry({
      status: 'running', stage: 'authoring', message: 'Codex 正在构建。', createdAt: at(0), updatedAt: at(12), finishedAt: null,
      history: [
        { stage: 'planning', at: at(0), message: '规划' },
        { stage: 'assets', at: at(3), message: '素材' },
        { stage: 'authoring', at: at(8), message: '构建' }
      ]
    }, Date.parse(at(20)));
    expect(telemetry.phases.find((phase) => phase.phase === 'authoring')).toMatchObject({ state: 'active', durationMs: 12_000 });
    expect(telemetry.phases.find((phase) => phase.phase === 'reviewing')?.state).toBe('waiting');
  });

  it('exposes the remaining hard budget instead of an open-ended wait', () => {
    const telemetry = summarizeWorkbenchJobTelemetry({
      status: 'running', stage: 'authoring', message: 'Codex 正在构建。', createdAt: at(0), updatedAt: at(20),
      deadlineAt: at(180), finishedAt: null,
      history: [{ stage: 'authoring', at: at(20), message: '构建' }]
    }, Date.parse(at(60)));
    expect(telemetry.remainingBudgetMs).toBe(120_000);
  });

  it('prefers persisted phase timings and adds only the live active interval', () => {
    const telemetry = summarizeWorkbenchJobTelemetry({
      status: 'running', stage: 'reviewing', message: '正在验收。', createdAt: at(0), updatedAt: at(30), finishedAt: null,
      phaseDurationsMs: { planning: 4_000, assets: 6_000, authoring: 20_000, reviewing: 0 },
      history: [{ stage: 'reviewing', at: at(30), message: '验收' }]
    }, Date.parse(at(38)));
    expect(telemetry.phases.map((phase) => [phase.phase, phase.durationMs])).toEqual([
      ['planning', 4_000], ['assets', 6_000], ['authoring', 20_000], ['reviewing', 8_000]
    ]);
  });

  it('formats sub-second, seconds and minute durations compactly', () => {
    expect(formatWorkbenchDuration(420)).toBe('420ms');
    expect(formatWorkbenchDuration(8_400)).toBe('8.4s');
    expect(formatWorkbenchDuration(72_000)).toBe('1m 12s');
  });

  it('keeps a generated page visible when visual judgment reaches its time limit', () => {
    const result = summarizeWorkbenchResult({
      status: 'review-required',
      stage: 'review-required',
      message: '专属网页已经生成并可运行；自动视觉验收未完成。',
      error: '专属代码模型调用超过 90 秒。',
      bestPreviewUrl: '/generated-runs/dedicated-example/',
      finalScore: null,
      deliveryQuality: {
        finalEligible: false,
        experience: {
          status: 'pending', score: null, structureMode: 'interactive-field', expectedStateCount: 4,
          reviewedStateCount: 0, archiveEligible: false, summary: '等待验收。', issues: []
        }
      },
      createdAt: at(0), updatedAt: at(54), finishedAt: at(54), history: []
    });

    expect(result).toMatchObject({
      state: 'review',
      verdict: '网页已生成 · 待视觉定稿',
      page: '已生成，可查看',
      structure: '等待检查',
      coverage: '0 个检查点 / 4 个产品状态',
      visual: '未得出最终结论',
      refinement: '达到上限，已停止',
      resultUrl: '/generated-runs/dedicated-example/'
    });
    expect(result.stopReason).toBe('视觉判断达到时间上限，系统已按约束停止；当前网页仍可查看。');
  });

  it('exposes the compiled source preview while final browser review is still running', () => {
    const result = summarizeWorkbenchResult({
      status: 'running', stage: 'reviewing', message: '正在检查。', bestPreviewUrl: null,
      sourcePreviewUrl: '/generated-runs/dedicated-source/', finalScore: null, deliveryQuality: null,
      createdAt: at(0), updatedAt: at(20), finishedAt: null, history: []
    });
    expect(result).toMatchObject({
      state: 'running', page: '已生成，可预览', visual: '正在检查', resultUrl: '/generated-runs/dedicated-source/'
    });
    expect(result.verdict).toContain('浏览器验收');
  });

  it('does not claim that a failed job produced a page', () => {
    const result = summarizeWorkbenchResult({
      status: 'failed', stage: 'authoring', message: '构建失败。', error: 'compile failed',
      bestPreviewUrl: null, finalScore: null, deliveryQuality: null,
      createdAt: at(0), updatedAt: at(20), finishedAt: at(20), history: []
    });

    expect(result).toMatchObject({
      state: 'failed', verdict: '本次没有形成网页', page: '生成失败', refinement: '已停止', resultUrl: null
    });
  });
});
