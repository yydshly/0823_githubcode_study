import { describe, expect, it } from 'vitest';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { compileComposedSceneRecipe } from '../src/generation/composed-scene-recipe';
import { generateCreativeRun } from '../src/generation/orchestrator';

const context = { quality: 'balanced' as const, renderer: 'webgl' as const, motion: 'full' as const };

describe('EffectSpec composed scene compiler', () => {
  it('changes scene grammar across materially different visual directions', async () => {
    const run = await generateCreativeRun(
      { text: '为真实硬件产品构建可拆解的 GLB 产品网页，需要真实 3D 模型和清晰材质。', seed: 17 },
      new BaselineBriefInterpreter(),
      context
    );
    const crystalSpec = structuredClone(run.candidates[0].effectSpec);
    crystalSpec.direction.visualGrammar = ['冰晶折射', '透明棱面'];
    crystalSpec.direction.spatialMetaphor = '漂浮的冰晶棱镜';
    const archiveSpec = structuredClone(crystalSpec);
    archiveSpec.id = 'effect-archive-grid';
    archiveSpec.direction.visualGrammar = ['档案网格', '数据坐标'];
    archiveSpec.direction.spatialMetaphor = '竖立的数据档案碑';

    const crystal = compileComposedSceneRecipe(crystalSpec);
    const archive = compileComposedSceneRecipe(archiveSpec);
    expect(crystal.hero.form).toBe('crystal');
    expect(archive.hero.form).toBe('monolith');
    expect(archive.field.form).toBe('grid');
    expect(crystal).not.toEqual(archive);
    expect(crystal.omittedAssetRequirements).toBe(1);
  });

  it('keeps local baseline candidates on verified legacy scenes', async () => {
    const run = await generateCreativeRun(
      { text: '为独立创作者设计清冷、克制并具有未来感的智能声音产品发布网页。', seed: 19 },
      new BaselineBriefInterpreter(),
      context
    );
    expect(run.candidates.every((candidate) => candidate.direction.scenePlugin !== 'composed-world')).toBe(true);
    expect(run.candidates.every((candidate) => candidate.manifest.scenes.main.recipe === undefined)).toBe(true);
  });
});
