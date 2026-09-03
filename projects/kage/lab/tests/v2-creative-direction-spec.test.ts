import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import {
  createDirectCreativeAuthorPackage,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';

describe('V2 multimodal creative direction', () => {
  it('treats the selected medium as a lead and admits purposeful supporting media', () => {
    const contract = createV2CreativeContract(
      '为一款帮助人寻找城市雨声的产品设计沉浸网页。用高质量生成环境建立雨夜意境，在可探索的 3D 声场中选择屋檐、树叶和窗面，选择后真实播放不同雨声并改变空间光线，最后保存今晚的声音路线。'
    );
    const execution = createCodexExecutionBrief(contract);
    const media = execution.creativeDirection.supportingMedia.map((item) => item.medium);

    expect(execution.creativeDirection.sourcePolicy).toBe('open-best-fit');
    expect(execution.creativeDirection.noGlobalStyleRules).toBe(true);
    expect(execution.creativeDirection.leadMedium.medium).toBeTruthy();
    expect(media).toContain('sound');
    expect(execution.creativeDirection.supportingMedia.length).toBeLessThanOrEqual(3);
    expect(new Set(media).size).toBe(media.length);
    expect(media).not.toContain(execution.creativeDirection.leadMedium.medium);
  });

  it('keeps only current user hard constraints and does not create hidden style bans', () => {
    const contract = createV2CreativeContract(
      '为公共天文馆设计明亮的 3D 星图网页。不要紫色科技风，访客滚动穿过同一星图并预约夜间观测。'
    );
    const direction = createCodexExecutionBrief(contract).creativeDirection;

    expect(direction.hardConstraints.length).toBeGreaterThan(0);
    expect(direction.hardConstraints.every((text) => contract.brief.includes(text) || text.includes('紫色'))).toBe(true);
    expect(JSON.stringify(direction.hardConstraints)).not.toMatch(/固定三屏|中央主体|必须.*暗色/);
  });

  it('serializes the open asset policy and bounded lead-plus-support rule for Codex', () => {
    const authorPackage = createDirectCreativeAuthorPackage(createV2CreativeContract(
      '为声音植物标本设计一个具有生成主视觉和真实可听反馈的互动网页，触摸叶片时声纹和光线同步变化，最后保存标本。'
    ));
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(authorPackage.authoringInput.creativeDirection.selectionRule)
      .toBe('one-direction-lead-plus-purposeful-support');
    expect(serialized).toContain('主导媒介，不是唯一可用媒介');
    expect(serialized).toContain('sourcePolicy=open-best-fit');
  });
});

