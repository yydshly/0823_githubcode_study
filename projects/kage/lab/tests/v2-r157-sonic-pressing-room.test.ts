import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';

const root = path.resolve(import.meta.dirname, '..');
const brief = '为一间声纹压片室设计沉浸网页。开场是一张没有声音的透明唱片；播放时低频、中频和高频分别改变沟槽深度、表面折光与边缘振动，滚动让声音逐渐压进材质，最后保存这一段声纹。需要真实音频反应与材质变化，不做参数工作台，也不冒充真实母带制作。';

describe('R157 sonic pressing room', () => {
  it('routes the unknown brief through promoted references and real-time WebGL causality', () => {
    const execution = createCodexExecutionBrief(createV2CreativeContract(brief));
    expect(execution.mediumDecision.preferred).toBe('webgl-procedural');
    expect(execution.references.map((reference) => reference.id)).toEqual(expect.arrayContaining([
      'positive-audio-signal-continuity',
      'positive-noise-surface-causality'
    ]));
    expect(execution.mediumDecision.assetResponsibilities).toContainEqual(expect.objectContaining({
      source: 'programmatic',
      required: true
    }));
  });

  it('binds the final decision to one final bundle and final browser evidence', () => {
    const finalPath = path.join(root, 'docs/v2-research/evidence/r157-sonic-pressing-room.final.json');
    expect(fs.existsSync(finalPath)).toBe(true);
    const record = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
    expect(record).toMatchObject({
      deliveryId: 'sonic-pressing-room',
      identity: { runId: 'direct-r157-sonic-pressing-room' },
      mediumDecision: { preferred: 'webgl-procedural' },
      executionBudget: { directionsBuilt: 1, assetBatches: 0, fullBuilds: 1, visualRefinements: 1 },
      verdict: 'pass'
    });
    expect(record.identity.bundleHash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.browserEvidence).toMatchObject({
      realScrollProgress: true,
      realAnalyserBands: true,
      webglFallbackPassed: true,
      audioFallbackPassed: true,
      horizontalOverflow: 0
    });
    for (const evidence of [
      record.browserEvidence.desktopOpening,
      record.browserEvidence.desktopInteraction,
      record.browserEvidence.desktopCompletion,
      record.browserEvidence.mobile,
      record.browserEvidence.webglFallback,
      record.browserEvidence.audioFallback
    ]) {
      expect(fs.existsSync(path.join(root, evidence))).toBe(true);
    }
  });
});
