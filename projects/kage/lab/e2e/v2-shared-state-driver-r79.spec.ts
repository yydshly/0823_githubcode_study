import { expect, test } from '@playwright/test';
import {
  captureDedicatedVisualReview,
  cleanupCapturedVisualReview
} from '../server/dedicated-visual-review.ts';
import { visualReviewPlanSchema } from '../src/generation/visual-review-plan.ts';

const runId = 'dedicated-bc4f5f92737f';

test('bounded probe verifies demo, wheel and manual takeover on the same state', async ({ baseURL }) => {
  const plan = visualReviewPlanSchema.parse({
    schemaVersion: 1,
    source: 'creative-contract',
    journeyMode: 'scroll-timeline',
    rendererRoute: 'dom-three-hybrid',
    checkpoints: [
      {
        id: 'opening',
        label: '风洞开场',
        progress: 0,
        surface: 'desktop',
        quality: 'high',
        reducedMotion: false,
        action: 'none',
        expectSceneChange: false,
        expectSubjectChange: false,
        expectMobileTaskPath: false
      },
      {
        id: 'driver',
        label: '播放、滚轮与人工接管共享状态探测',
        progress: 0.42,
        surface: 'desktop',
        quality: 'high',
        reducedMotion: false,
        action: 'driver-probe',
        expectSceneChange: true,
        expectSubjectChange: false,
        expectMobileTaskPath: false
      },
      {
        id: 'final',
        label: '风洞最终状态',
        progress: 1,
        surface: 'desktop',
        quality: 'high',
        reducedMotion: false,
        action: 'none',
        expectSceneChange: false,
        expectSubjectChange: false,
        expectMobileTaskPath: false
      },
      {
        id: 'mobile',
        label: '移动端 reduced-motion 基线',
        progress: 0,
        surface: 'mobile',
        quality: 'low',
        reducedMotion: true,
        action: 'none',
        expectSceneChange: false,
        expectSubjectChange: false,
        expectMobileTaskPath: false
      }
    ]
  });
  const review = await captureDedicatedVisualReview(runId, baseURL || 'http://127.0.0.1:8143', process.env, plan);

  try {
    const frame = review.evidence.frames.find((item) => item.id === 'driver');
    console.log(JSON.stringify({ driverState: frame?.driverState, assessment: review.assessment }, null, 2));
    expect(frame?.driverState).toMatchObject({
      rootFound: true,
      demoControlFound: true,
      progressMarkerFound: true,
      manualControlFound: true,
      demoProgressChanged: true,
      wheelProgressChanged: true,
      manualOverrideObserved: true,
      demoSceneChanged: true,
      wheelSceneChanged: true,
      manualSceneChanged: true,
      modes: ['demo', 'scroll', 'manual']
    });
    expect(review.assessment.findings.map((finding) => finding.code)).not.toEqual(
      expect.arrayContaining([
        'interaction-driver-unverified',
        'interaction-driver-static',
        'interaction-driver-handoff-failed'
      ])
    );
  } finally {
    await cleanupCapturedVisualReview(review);
  }
});
