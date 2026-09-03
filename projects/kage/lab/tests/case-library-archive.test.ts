import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { archiveDedicatedCase, assertFeaturedDeliveryQuality } from '../server/case-library';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

const projectRoot = resolve(process.cwd());
const sourceId = 'dedicated-7c944e0c386f';
const temporaryRoots: string[] = [];

async function fixture(includeCover: boolean): Promise<Record<string, string>> {
  const root = await mkdtemp(join(tmpdir(), 'kage-case-archive-'));
  temporaryRoots.push(root);
  await mkdir(join(root, 'generated', 'runs'), { recursive: true });
  await cp(join(projectRoot, 'cases', 'runs', sourceId), join(root, 'generated', 'runs', sourceId), { recursive: true });
  if (includeCover) {
    const target = join(root, 'public', 'creative-assets', 'r12-paper-restoration', 'paper-damaged-v1.png');
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, Buffer.alloc(2048, 1));
  }
  return { SIGNAL_PROJECT_ROOT: root };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('case archive presentation contract', () => {
  it('rejects a featured procedural result before its L3 visual proof exists', () => {
    const contract = createV2CreativeContract('为一间木版套印工坊设计网页，滚动时同一张和纸逐步落下墨层、压痕和纤维。');
    expect(() => assertFeaturedDeliveryQuality({
      quality: 'high',
      creativeContract: contract,
      reference: { assets: [] },
    }, {
      visualAcceptance: {
        schemaVersion: 1,
        verdict: 'pass',
        score: 86,
        assetRole: 'supporting',
        summary: '页面可运行，但材质主体仍像程序化样稿。',
        findings: [],
      },
    })).toThrow('精选案例素材交付质量未通过');
  });

  it('derives and persists a cover from the final bundle asset responsibilities', async () => {
    const environment = await fixture(true);
    const entry = await archiveDedicatedCase({
      id: sourceId,
      stage: 'refined',
      tags: ['archive-contract']
    }, environment);

    expect(entry.previewUrl).toBe(`/cases/${sourceId}/`);
    expect(entry.presentation).toMatchObject({
      assetUrl: '/creative-assets/r12-paper-restoration/paper-damaged-v1.png',
      kind: 'environment',
      fit: 'cover'
    });
    const catalog = JSON.parse(await readFile(join(environment.SIGNAL_PROJECT_ROOT, 'cases', 'catalog.json'), 'utf8'));
    expect(catalog.cases[0].presentation).toEqual(entry.presentation);
  });

  it('rejects a public archive when its selected cover file is missing', async () => {
    const environment = await fixture(false);
    await expect(archiveDedicatedCase({
      id: sourceId,
      stage: 'refined',
      tags: ['archive-contract']
    }, environment)).rejects.toThrow('案例封面资源不存在');
  });

  it('refreshes an existing case when the selected final run is archived again', async () => {
    const environment = await fixture(true);
    const request = {
      id: sourceId,
      stage: 'refined' as const,
      tags: ['archive-contract']
    };
    await archiveDedicatedCase(request, environment);

    const sourceReportPath = join(environment.SIGNAL_PROJECT_ROOT, 'generated', 'runs', sourceId, 'build-report.json');
    const report = JSON.parse(await readFile(sourceReportPath, 'utf8'));
    report.manualRefreshMarker = 'latest-refinement';
    await writeFile(sourceReportPath, JSON.stringify(report, null, 2));

    await archiveDedicatedCase(request, environment);
    const archivedReport = JSON.parse(await readFile(
      join(environment.SIGNAL_PROJECT_ROOT, 'cases', 'runs', sourceId, 'build-report.json'),
      'utf8'
    ));
    expect(archivedReport.manualRefreshMarker).toBe('latest-refinement');
  });
});
