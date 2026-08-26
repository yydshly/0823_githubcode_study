import { describe, expect, it } from 'vitest';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { generateCreativeRun } from '../src/generation/orchestrator';
import { compileRevisionPlan, evaluateCandidate } from '../src/evaluation/evaluation';

const context = { quality: 'balanced' as const, renderer: 'webgl' as const, motion: 'full' as const };

async function candidateFor(text: string) {
  const run = await generateCreativeRun({ text, seed: 17 }, new BaselineBriefInterpreter(), context);
  return run.candidates[0];
}

describe('offline evaluation and bounded revision planning', () => {
  it('separates deterministic proof from visual judgment without pretending to use vision', async () => {
    const candidate = await candidateFor('为独立创作者设计一款清冷、克制但有未来感的智能声音产品发布网页，先建立情绪，再解释能力，最后留下行动。');
    const report = evaluateCandidate(candidate);
    const plan = compileRevisionPlan(report, candidate);

    expect(report.evaluator).toEqual({ mode: 'offline-deterministic', adapter: 'offline-evaluator-v1', visionUsed: false });
    expect(report.status).toBe('needs-review');
    expect(report.checks.find((check) => check.id === 'artifact-identity')?.status).toBe('pass');
    expect(report.checks.find((check) => check.id === 'runtime-evidence')?.status).toBe('manual-required');
    expect(report.manualCheckIds).toEqual(expect.arrayContaining(['runtime-evidence', 'visual-composition', 'signature-moment', 'material-credibility']));
    expect(plan.status).toBe('review-required');
    expect(plan.preserve.join(' ')).toContain(candidate.effectSpec.goal.subject);
    expect(plan.revisions.some((revision) => revision.targetArtifact === 'browser-evidence' && revision.regeneration === 'none')).toBe(true);
  });

  it('blocks an asset-dependent direction and targets only the failed production layers', async () => {
    const candidate = await candidateFor('为一款新型声学设备设计发布网页：需要真实 GLB 产品拆解、随音乐响应，并能导出 MP4 自动成片。');
    const report = evaluateCandidate(candidate);
    const plan = compileRevisionPlan(report, candidate);

    expect(report.status).toBe('blocked');
    expect(report.blockingCheckIds).toEqual(expect.arrayContaining(['asset-readiness', 'production-readiness']));
    expect(plan.status).toBe('blocked');
    expect(plan.revisions).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceCheckId: 'asset-readiness', targetArtifact: 'asset-plan', regeneration: 'partial' }),
      expect.objectContaining({ sourceCheckId: 'production-readiness', targetArtifact: 'production-plan', regeneration: 'partial' })
    ]));
    expect(plan.preserve.join(' ')).toContain(candidate.effectSpec.thesis);
  });

  it('can pass when real runtime evidence and explicit human visual observations are attached', async () => {
    const candidate = await candidateFor('为独立创作者设计一款清冷、克制但有未来感的智能声音产品发布网页，先建立情绪，再解释能力，最后留下行动。');
    const report = evaluateCandidate(candidate, {
      runtime: {
        lifecycle: 'running', renderer: 'webgl', viewport: { width: 1440, height: 900 }, quality: 'balanced',
        drawCalls: candidate.capabilityPlan.estimated.drawCalls, scenePluginId: candidate.direction.scenePlugin,
        semanticFallbackVerified: true, reducedMotionVerified: true, horizontalOverflow: false
      },
      screenshots: [{ id: 'desktop-hero', path: 'docs/screenshots/desktop-hero.png', width: 1440, height: 900 }],
      manualVisual: [
        { checkId: 'visual-composition', status: 'pass', observation: '标题与主视觉的焦点层级清楚，没有关键遮挡。', evidence: ['desktop-hero screenshot'] },
        { checkId: 'signature-moment', status: 'pass', observation: '主体显现和稳定停留形成了可辨认的核心记忆点。', evidence: ['desktop-hero screenshot'] },
        { checkId: 'material-credibility', status: 'pass', observation: '材质、色温和品牌语气与目标描述一致。', evidence: ['desktop-hero screenshot'] }
      ]
    });
    const plan = compileRevisionPlan(report, candidate);

    expect(report.status).toBe('pass');
    expect(report.manualCheckIds).toEqual([]);
    expect(report.checks.find((check) => check.id === 'runtime-evidence')?.status).toBe('pass');
    expect(plan.status).toBe('no-change');
    expect(plan.revisions).toEqual([]);
  });
});
