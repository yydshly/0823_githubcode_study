import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { selectCreativeMediumDecision } from '../src/v2/creative-medium-decision.ts';
import { deriveVisualAmbitionContract } from '../src/v2/visual-ambition-planner.ts';

describe('V2 visual ambition planner', () => {
  it('derives immersive ambition from a content-required spatial journey', () => {
    const contract = createV2CreativeContract(
      '为梦境记录产品设计网页。开场像刚醒来的模糊房间，滚动时穿过同一空间，记忆碎片逐渐清晰，最后记录今晚的梦。'
    );
    const ambition = deriveVisualAmbitionContract(contract);

    expect(ambition.intentLevel).toBe('immersive');
    expect(ambition.heroMoment.observableRuntimeChange).not.toBeNull();
    expect(ambition.motionArc.beats.some((beat) => beat.driver !== 'none')).toBe(true);
    expect(ambition.spatialDepth.mode).not.toBe('flat');
  });

  it('keeps an information-led page restrained without forcing Three.js or motion', () => {
    const ambition = deriveVisualAmbitionContract(createV2CreativeContract(
      '为社区剧场设计一张演出季网页，让访客理解本周节目并完成购票。'
    ));

    expect(ambition).toMatchObject({
      intentLevel: 'restrained',
      rendering: { primary: 'dom-css' },
      spatialDepth: { mode: 'flat' },
      heroMoment: { observableRuntimeChange: null }
    });
    expect(ambition.motionArc.beats).toHaveLength(1);
    expect(ambition.motionArc.beats[0]?.driver).toBe('none');
  });

  it('can select a flagship non-Three direction without making Three.js universal', () => {
    const ambition = deriveVisualAmbitionContract(createV2CreativeContract(
      '为手语演出季设计明亮的旗舰视觉网页。让手势轨迹形成吸引眼球的实时主视觉，并引导观众查看本周节目。'
    ));

    expect(ambition.intentLevel).toBe('flagship');
    expect(ambition.rendering.primary).not.toBe('threejs-3d');
    expect(ambition.heroMoment.appearsWithinSeconds).toBeLessThanOrEqual(5);
    expect(ambition.heroMoment.observableRuntimeChange).not.toBeNull();
  });

  it('does not mistake a negated style for a request to raise ambition', () => {
    const ambition = deriveVisualAmbitionContract(createV2CreativeContract(
      '为社区剧场设计演出季网页，让访客查看本周节目并购票。不要沉浸式，不要 3D，不要暗色科技风。'
    ));

    expect(ambition.intentLevel).toBe('restrained');
    expect(ambition.rendering.primary).toBe('dom-css');
  });

  it('does not inherit project-wide layout or style bans into the ambition plan', () => {
    const ambition = deriveVisualAmbitionContract(createV2CreativeContract(
      '为儿童植物观察日设计一张明亮网页，帮助家庭选择活动并完成报名。'
    ));
    const serialized = JSON.stringify(ambition);

    expect(serialized).not.toContain('暗色');
    expect(serialized).not.toContain('三屏');
    expect(serialized).not.toContain('中央主体');
    expect(serialized).not.toContain('巨型标题');
  });

  it('keeps a generated key visual primary while reporting explicit WebGL enhancement', () => {
    const contract = createV2CreativeContract(
      '为棱镜种子剧场设计明亮网页。调用生图生成温室中的高质量主视觉，并用 WebGL 动态增强折射光场；滚轮改变光线角度，最后保存折光标本。'
    );
    const decision = selectCreativeMediumDecision(contract);
    const ambition = deriveVisualAmbitionContract(contract, decision);

    expect(decision.preferred).toBe('generated-image');
    expect(decision.assetResponsibilities).toEqual([
      expect.objectContaining({ source: 'generated-image' })
    ]);
    expect(ambition.rendering).toMatchObject({
      primary: 'raster-image',
      supporting: expect.arrayContaining(['dom-css', 'webgl-shader'])
    });
    expect(ambition.rendering.supporting).not.toContain('threejs-3d');
  });

  it('reports Canvas enhancement only when a raster-led brief asks for it explicitly', () => {
    const withoutEnhancement = deriveVisualAmbitionContract(createV2CreativeContract(
      '为种子档案设计网页，调用生图生成明亮的编辑主视觉，引导用户保存标本。'
    ));
    const withEnhancement = deriveVisualAmbitionContract(createV2CreativeContract(
      '为种子档案设计网页，调用生图生成明亮的编辑主视觉，并用 Canvas 2D 交互增强光影变化，引导用户保存标本。'
    ));

    expect(withoutEnhancement.rendering).toMatchObject({
      primary: 'raster-image',
      supporting: ['dom-css']
    });
    expect(withEnhancement.rendering).toMatchObject({
      primary: 'raster-image',
      supporting: expect.arrayContaining(['dom-css', 'canvas-2d'])
    });
  });
});
