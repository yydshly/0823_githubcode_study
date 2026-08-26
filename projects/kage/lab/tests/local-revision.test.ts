import { describe, expect, it } from 'vitest';
import { compileLocalRevision } from '../src/evaluation/local-revision';
import { runtimeEvidenceBundleSchema, runtimeEvidenceForEvaluation } from '../src/evaluation/runtime-evidence';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { generateCreativeRun } from '../src/generation/orchestrator';

async function candidate() {
  const run = await generateCreativeRun(
    { text: '为独立创作者设计一款清冷、克制但有未来感的智能声音产品发布网页，先建立情绪，再解释能力，最后留下行动。', seed: 17 },
    new BaselineBriefInterpreter(),
    { quality: 'balanced', renderer: 'webgl', motion: 'full' }
  );
  return run.candidates[0];
}

describe('no-API bounded local revision', () => {
  it('changes only the declared accent layer and proves preserved artifacts', async () => {
    const source = await candidate();
    const compiled = compileLocalRevision('强调色改为 #8fdcff', source);

    expect(compiled.result).toMatchObject({ status: 'applied', intent: 'accent-color', sourceCandidateId: source.id });
    expect(compiled.candidate?.id).not.toBe(source.id);
    expect(compiled.candidate?.effectSpec.direction.palette.accent).toBe('#8fdcff');
    expect(compiled.candidate?.manifest.theme.accent).toBe('#8fdcff');
    expect(compiled.candidate?.manifest.cameraTracks).toEqual(source.manifest.cameraTracks);
    expect(compiled.candidate?.manifest.scenes.main.plugin).toBe(source.manifest.scenes.main.plugin);
    expect(compiled.result.changedPaths).toEqual([
      'effectSpec.direction.palette.accent', 'direction.theme.accent', 'manifest.theme.accent', 'manifest.sceneTracks.*.keyframes.*.value.accent'
    ]);
    expect(compiled.result.unchangedProof.every((proof) => proof.unchanged && proof.beforeHash === proof.afterHash)).toBe(true);
  });

  it('supports a page-title revision without rewriting chapter copy or assets', async () => {
    const source = await candidate();
    const compiled = compileLocalRevision('页面标题改为「声之境」', source);

    expect(compiled.result).toMatchObject({ status: 'applied', intent: 'page-title' });
    expect(compiled.candidate?.manifest.title).toBe('声之境');
    expect(compiled.candidate?.effectSpec.title).toBe('声之境');
    expect(Object.fromEntries(Object.entries(compiled.candidate!.manifest.nodes).map(([id, node]) => [id, node.content]))).toEqual(
      Object.fromEntries(Object.entries(source.manifest.nodes).map(([id, node]) => [id, node.content]))
    );
    expect(compiled.candidate?.assetPlan.items).toEqual(source.assetPlan.items);
  });

  it('does not guess an unsupported or ambiguous revision', async () => {
    const source = await candidate();
    const unsupported = compileLocalRevision('让它更高级更震撼', source);
    const ambiguous = compileLocalRevision('强调色改为蓝色', source);

    expect(unsupported.result).toMatchObject({ status: 'unsupported', revisedCandidateId: null, changedPaths: [] });
    expect(unsupported.candidate).toBeNull();
    expect(ambiguous.result).toMatchObject({ status: 'invalid', revisedCandidateId: null, changedPaths: [] });
    expect(ambiguous.candidate).toBeNull();
  });

  it('aggregates desktop, mobile and fallback samples into deterministic evaluator evidence', () => {
    const sample = (mode: 'desktop-webgl' | 'mobile-webgl' | 'mobile-fallback', width: number, height: number, rendererPreference: 'webgl' | 'none') => ({
      id: `sample-${mode}`, mode, url: `http://127.0.0.1/${mode}`, viewport: { width, height },
      lifecycle: rendererPreference === 'none' ? 'fallback' as const : 'running' as const,
      rendererPreference, motion: 'reduce' as const, quality: width > 400 ? 'balanced' as const : 'low' as const,
      framesRendered: rendererPreference === 'webgl' ? 1 : 0, drawCalls: rendererPreference === 'webgl' ? 12 : 0,
      scenePluginId: rendererPreference === 'webgl' ? 'composed-world' : null,
      nodeCount: 4, navCount: 4, semanticContentPresent: true, horizontalOverflow: false
    });
    const bundle = runtimeEvidenceBundleSchema.parse({
      schemaVersion: 1, id: 'runtime-evidence-test', candidateId: 'candidate-test', manifestId: 'candidate-test',
      collector: { mode: 'same-origin-browser', adapter: 'runtime-evidence-collector-v1', screenshotVisionUsed: false },
      samples: [sample('desktop-webgl', 1440, 900, 'webgl'), sample('mobile-webgl', 390, 844, 'webgl'), sample('mobile-fallback', 390, 844, 'none')],
      status: 'ready', failures: [], summary: '三个状态均通过。'
    });

    expect(runtimeEvidenceForEvaluation(bundle)).toMatchObject({
      lifecycle: 'running', renderer: 'webgl', scenePluginId: 'composed-world',
      semanticFallbackVerified: true, reducedMotionVerified: true, horizontalOverflow: false
    });
  });
});
