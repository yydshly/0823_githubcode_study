import { expect, test } from '@playwright/test';

test('provider API reports availability and preserves local provenance', async ({ request }) => {
  const statusResponse = await request.get('/api/creative/providers');
  expect(statusResponse.ok()).toBe(true);
  const status = await statusResponse.json() as { providers: Array<{ id: string; available: boolean; model: string; capabilities: string[] }> };
  expect(status.providers.map((item) => item.id)).toEqual(['codex', 'mimo', 'minimax', 'openai', 'local']);
  expect(status.providers.find((item) => item.id === 'local')).toMatchObject({ available: true, model: 'baseline-keyword-v1' });
  expect(status.providers.find((item) => item.id === 'local')?.capabilities).toContain('deterministic-analysis');
  expect(status.providers.find((item) => item.id === 'codex')?.capabilities).toContain('code-synthesis');
  expect(status.providers.every((item) => Array.isArray(item.capabilities))).toBe(true);

  const interpretationResponse = await request.post('/api/creative/interpret', {
    data: {
      provider: 'local',
      brief: { text: '为海洋记忆数字展陈设计清冷、可探索的沉浸式网页。', seed: 17 }
    }
  });
  expect(interpretationResponse.ok()).toBe(true);
  const body = await interpretationResponse.json() as { interpretation: { provenance: { requested: string; selected: string; mode: string }; directions: Array<{ structure: string }> } };
  expect(body.interpretation.provenance).toMatchObject({ requested: 'local', selected: 'local', mode: 'local' });
  expect(body.interpretation.directions.map((item) => item.structure)).toEqual(['focus', 'journey', 'branching']);

  const malformedAssetResponse = await request.post('/api/creative/assets/generate', {
    data: { schemaVersion: 1, provider: 'minimax', brief: '有效描述但缺少 EffectSpec。', seed: 17 }
  });
  expect(malformedAssetResponse.status()).toBe(400);
});
