import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';

const exactBrief = '为一间收藏雨后街区气味的独立档案馆设计实验性杂志网页。开场是一间保存雨、旧书与晚桂记忆的档案室；滚动时柏油、纸张和花香的痕迹逐渐扩散，指针只揭示局部材料关系，最后行动为进入本月气味档案。页面要像一本会呼吸的实验性杂志，不要参数工具或科技工作台。';
const expectedIdentity = {
  runId: 'direct-2ixs32',
  bundleHash: 'ce0c602f0a6a0d5ada92247e8cc5f25c8e3bdffbaf4d02e8d5f7369dfbcb8124'
};
const sourceRoot = new URL('../pages/v2/deliveries/after-rain-archive/', import.meta.url);

describe('R119 form-diversity proof evidence', () => {
  it('compiles the archive brief into an editorial scroll journey instead of a workbench', () => {
    const contract = createV2CreativeContract(exactBrief);
    const authorPackage = createDirectCreativeAuthorPackage(contract);

    expect(contract.experience).toMatchObject({
      pattern: 'editorial-field',
      structure: { mode: 'editorial-flow', segmentPolicy: 'content-derived' }
    });
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'editorial-evidence',
      surfaceArchetype: 'editorial-narrative',
      controlVisibility: 'none',
      interactionStyle: 'scroll',
      strength: 'advisory'
    });
    expect(authorPackage).toMatchObject({
      contractId: contract.id,
      authoringInput: {
        contractId: contract.id,
        exactBrief,
        technical: {
          styleDiversity: {
            structureDirection: {
              surfaceArchetype: 'editorial-narrative',
              controlVisibility: 'none',
              interactionStyle: 'scroll'
            }
          }
        }
      },
      runSeed: {
        id: expectedIdentity.runId,
        contractId: contract.id,
        interaction: { mode: 'scroll', audioApplicable: false }
      },
      evidenceRequirements: {
        profile: {
          interactionMode: 'scroll',
          requiredCheckpoints: ['opening', 'core', 'mobile', 'scroll']
        },
        identityBinding: 'runId+bundleHash'
      }
    });
  });

  it('binds the browser-approved delivery to the exact ordered source bundle', () => {
    const hash = createHash('sha256');
    const sources: string[] = [];
    for (const fileName of ['index.html', 'style.css', 'main.ts']) {
      const bytes = readFileSync(new URL(fileName, sourceRoot));
      hash.update(fileName);
      hash.update(Buffer.from([0]));
      hash.update(bytes);
      sources.push(bytes.toString('utf8'));
    }

    expect(hash.digest('hex')).toBe(expectedIdentity.bundleHash);
    expect(sources.join('\n')).not.toMatch(/type=["']range["']|control-panel|live-reading/i);
    expect(sources.join('\n')).toContain('data-enter');
    expect(sources.join('\n')).toContain('__afterRainArchive');
  });
});
