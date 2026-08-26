import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface CatalogCase {
  id: string;
  brief: string;
  stage: string;
  previewUrl: string;
}

const projectRoot = resolve(process.cwd());

async function readCatalog(): Promise<CatalogCase[]> {
  const source = await readFile(join(projectRoot, 'cases', 'catalog.json'), 'utf8');
  return (JSON.parse(source) as { cases: CatalogCase[] }).cases;
}

describe('curated case catalog', () => {
  it('keeps a small portfolio with one final case per brief', async () => {
    const cases = await readCatalog();
    expect(cases.length).toBeGreaterThanOrEqual(4);
    expect(cases.length).toBeLessThanOrEqual(6);
    expect(new Set(cases.map((item) => item.brief)).size).toBe(cases.length);
    expect(cases.every((item) => item.stage === 'featured' || item.stage === 'refined')).toBe(true);
  });

  it('points every public entry at a complete stable archive', async () => {
    const cases = await readCatalog();
    await Promise.all(cases.map(async (item) => {
      expect(item.previewUrl).toBe(`/cases/${item.id}/`);
      const runDirectory = join(projectRoot, 'cases', 'runs', item.id);
      await access(join(runDirectory, 'bundle.json'));
      await access(join(runDirectory, 'build-report.json'));
    }));
  });

  it('contains the six distinct capability directions selected for the current milestone', async () => {
    const cases = await readCatalog();
    const ids = new Set(cases.map((item) => item.id));
    expect(ids).toEqual(new Set([
      'dedicated-ba4e9d10caaa-depth-field',
      'dedicated-r36-delivery-final',
      'dedicated-896cfb7e6657',
      'dedicated-1edb98865f4c',
      'dedicated-1b9f0b05107b',
      'dedicated-8574ee46ab16'
    ]));
  });
});
