import { describe, expect, it } from 'vitest';
import type { CapabilityProposal } from '../src/capabilities/proposal';
import { auditSynthesisFiles, synthesizeProposal, type SynthesisFile } from '../src/capabilities/synthesis';

function proposal(kind: CapabilityProposal['kind'], id: string): CapabilityProposal {
  return {
    id: `proposal-${id}`, status: 'review-required', targetCapabilityId: `${kind}:${id}`, kind, title: `Draft ${id}`,
    summary: 'An explicit unsupported capability that requires isolated implementation evidence.', evidence: ['explicit request'],
    priority: 'important', risk: 'high', contract: ['Keep runtime boundaries'], qualityGates: ['Unit test', 'Visual review'],
    recommendedFiles: [], fallback: 'Keep the existing registered capability.'
  };
}

describe('virtual capability synthesis workspace', () => {
  it('creates an audited, non-executable driver workspace', () => {
    const workspace = synthesizeProposal(proposal('driver', 'audio-reactive'));
    expect(workspace).toMatchObject({ status: 'draft', isolation: 'virtual-workspace', execution: 'never', registration: 'not-registered' });
    expect(workspace.files.map((file) => file.path)).toEqual([
      'src/drivers/audio-reactive-driver.ts', 'tests/audio-reactive.test.ts', 'docs/audio-reactive.md'
    ]);
    expect(workspace.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('keeps asset synthesis honest at L0 Missing', () => {
    const workspace = synthesizeProposal(proposal('asset', 'product-model'));
    expect(workspace.files.find((file) => file.path.endsWith('asset-manifest.json'))?.content).toContain('L0-missing');
    expect(workspace.files.some((file) => /\.(glb|gltf)$/i.test(file.path))).toBe(false);
    expect(workspace.status).toBe('draft');
  });

  it('blocks unsafe paths and generated network execution', () => {
    const content = "fetch('remote'); export const unsafe = true;";
    const files: SynthesisFile[] = [{ path: '../escape.ts', language: 'typescript', content, bytes: content.length }];
    const checks = auditSynthesisFiles(proposal('scene', 'unsafe-world'), files);
    expect(checks.filter((check) => check.status === 'block').map((check) => check.id)).toEqual(expect.arrayContaining(['safe-paths', 'forbidden-api', 'documentation', 'test-scaffold', 'plugin-lifecycle']));
  });
});
