import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  positiveReferenceLibrary,
  referenceEvidencePackSchema,
  selectPositiveReferenceEvidence
} from '../src/v2/reference-intelligence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief, serializeCodexAuthoringBrief } from '../src/v2/codex-execution-brief.ts';

describe('positive reference evidence', () => {
  it('covers six representative capability categories with checked evidence', () => {
    expect(new Set(positiveReferenceLibrary.map((pack) => pack.category))).toEqual(new Set([
      'continuous-asset-story',
      'spatial-environment-journey',
      'anchored-product-causality',
      'evidence-led-editorial',
      'semantic-direct-interaction',
      'articulated-spatial-reveal'
    ]));

    for (const pack of positiveReferenceLibrary) {
      expect(() => referenceEvidencePackSchema.parse(pack)).not.toThrow();
      expect(pack.macroStructureCategory).toBeTruthy();
      expect(pack.source.uri).toBeTruthy();
      expect(pack.evidence.length).toBeGreaterThan(0);
      expect(pack.observedMechanism.length).toBeGreaterThan(0);
      expect(pack.positiveBorrowPrinciples.length).toBeGreaterThan(0);
      expect(pack.relevanceReason).toBeTruthy();
      expect(pack.confidence).toBeGreaterThan(0);
      expect(pack.advisoryRisks.length).toBeGreaterThan(0);
      expect(pack.advisoryRisks.join('')).not.toMatch(/不要|禁止|必须采用|必须使用/);
      for (const artifact of pack.evidence) {
        expect(artifact.verified).toBe(true);
        if (!artifact.uri.startsWith('https://')) {
          expect(existsSync(resolve(process.cwd(), artifact.uri)), artifact.uri).toBe(true);
        }
      }
    }

    const legacyPack = Object.fromEntries(
      Object.entries(positiveReferenceLibrary[0]!).filter(([key]) => key !== 'macroStructureCategory')
    );
    expect(referenceEvidencePackSchema.parse(legacyPack).macroStructureCategory).toBe('sequence');
  });

  it('returns no reference for low relevance and never relies on pattern alone', () => {
    expect(selectPositiveReferenceEvidence(
      '为社区花园开放日制作报名网页，展示日期和报名入口。',
      'continuous-scroll'
    )).toEqual([]);
    expect(selectPositiveReferenceEvidence(
      '为社区花园开放日制作报名网页，不要参数滑块或配方模拟。',
      'editorial-field'
    )).toEqual([]);
  });

  it('selects at most three packs only from explicit semantic matches', () => {
    const selected = selectPositiveReferenceEvidence(
      '为古籍纸张修复设计实验网页，用参数滑块调整补纸配方，并让机械花以关节展开解释纤维结构。',
      'material-transformation',
      9
    );

    expect(selected).toHaveLength(3);
    expect(selected.map((pack) => pack.id)).toEqual(expect.arrayContaining([
      'positive-paper-restoration-evidence',
      'positive-semantic-direct-interaction',
      'positive-iris-articulated-reveal'
    ]));
    expect(selected.every((pack) => pack.relevanceReason.includes('命中'))).toBe(true);
  });

  it('diversifies macro structures without adding an unrelated reference', () => {
    const selected = selectPositiveReferenceEvidence(
      '把梦境房间、云上观测站、声音产品、古籍纸张修复、参数滑块和机械花关节展开组织成可探索的研究网页。',
      'material-transformation',
      3
    );

    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((pack) => pack.macroStructureCategory)).size).toBeGreaterThanOrEqual(2);
    expect(selected.filter((pack) => (
      pack.macroStructureCategory === 'fixed-single-subject-overlay-workbench'
    ))).toHaveLength(1);
    expect(selected.every((pack) => pack.relevanceReason.includes('命中'))).toBe(true);
  });

  it('keeps zero or one result when relevance or structural variety is insufficient', () => {
    expect(selectPositiveReferenceEvidence(
      '为社区花园开放日制作报名网页，展示日期和报名入口。',
      'continuous-scroll',
      3
    )).toEqual([]);

    const fixedOnly = selectPositiveReferenceEvidence(
      '让声音产品作为持续锚点，同时像机械花一样关节展开。',
      'product-atmosphere',
      3
    );
    expect(fixedOnly).toHaveLength(1);
    expect(fixedOnly[0]?.macroStructureCategory).toBe('fixed-single-subject-overlay-workbench');
  });

  it('passes positive borrow and advisory risk into the first authoring pass', () => {
    const contract = createV2CreativeContract(
      '为一款帮助人记录梦境的产品设计网页。开场像刚醒来的模糊房间，滚动时记忆逐渐形成空间，最后记录今晚的梦。'
    );
    const execution = createCodexExecutionBrief(contract);
    const authoring = JSON.parse(serializeCodexAuthoringBrief(contract));

    expect(execution.references).toHaveLength(1);
    expect(execution.references[0]).toMatchObject({
      id: 'positive-dream-room-memory',
      borrow: execution.references[0]?.positiveBorrowPrinciples
    });
    expect(execution.references[0]).not.toHaveProperty('avoid');
    expect(authoring.references[0].positiveBorrowPrinciples).toEqual(
      execution.references[0]?.positiveBorrowPrinciples
    );
    expect(execution.references[0]?.evidenceArtifacts[0]).toMatchObject({
      kind: 'screenshot',
      verified: true
    });
    expect(authoring.references[0]).not.toHaveProperty('evidence');
    expect(authoring.references[0].advisoryRisks).toEqual(execution.references[0]?.advisoryRisks);
    expect(authoring.references[0]).not.toHaveProperty('avoid');
    expect(authoring.references[0]).not.toHaveProperty('borrow');
  });
});
