import { expect, test } from '@playwright/test';

test('serves approved project assets to the opaque generated-page sandbox', async ({ request }) => {
  const response = await request.get('/creative-assets/fashion-fluid-couture-v1.png', { headers: { Origin: 'null' } });
  expect(response.status()).toBe(200);
  expect(response.headers()['access-control-allow-origin']).toBe('null');
  expect(Number(response.headers()['content-length'] || 0)).toBeGreaterThan(1_000_000);
});

test('does not add opaque-origin CORS to unrelated public routes', async ({ request }) => {
  const response = await request.get('/index.html', { headers: { Origin: 'null' } });
  expect(response.status()).toBe(200);
  expect(response.headers()['access-control-allow-origin']).toBeUndefined();
});
