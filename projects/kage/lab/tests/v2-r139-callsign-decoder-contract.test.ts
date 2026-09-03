import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';
import { selectCreativeMediumDecision } from '../src/v2/creative-medium-decision.ts';

export const callsignDecoderBrief = '为第一次参加业余无线电公开课的人设计一个「十秒呼号解码」网页。一条虚构演示电文以点划文字与合成音调同步出现，用户必须实际聆听并辨认点划节奏。点击试听按钮或按空格键播放每一段，点划在原位展开对应字母，之后提交解码；最终行动是保存这张呼号练习卡。页面像一张会发声的现代排版作品，使用明亮纸白、信号橙和墨黑。所有呼号与电文均为虚构演示。';

describe('R139 unseen callsign decoder contract', () => {
  it('selects a typographic sonic editorial field without a workbench or scroll-led task', () => {
    const contract = createV2CreativeContract(callsignDecoderBrief);

    expect(contract.experience).toMatchObject({
      pattern: 'editorial-field',
      structure: { mode: 'editorial-flow' }
    });
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'typographic-sonic-field',
      controlVisibility: 'contextual'
    });
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'callsign-waiting',
      'callsign-sounding',
      'callsign-decoding',
      'callsign-checked',
      'callsign-saved'
    ]);
    expect(contract.direction.interaction).toMatchObject({
      primaryInput: 'direct-navigation',
      pointerRole: 'primary'
    });
    expect(contract.direction.interaction.semanticAction).toMatch(/试听|播放/);
    expect(contract.direction.interaction.keyboardAlternative).toContain('空格');
  });

  it('keeps sound and typography as the authoritative code-native medium', () => {
    const contract = createV2CreativeContract(callsignDecoderBrief);
    const medium = selectCreativeMediumDecision(contract);
    const authorPackage = createDirectCreativeAuthorPackage(contract);

    expect(medium).toMatchObject({
      preferred: 'code-native',
      assetResponsibilities: []
    });
    expect(contract.technical.productSemanticFeedback).toMatchObject({
      selected: true,
      authoringContract: {
        route: 'synthesized-web-audio',
        activation: 'explicit-user-gesture'
      }
    });
    expect(authorPackage).toMatchObject({
      authoringInput: {
        exactBrief: callsignDecoderBrief,
        mediumDecision: { preferred: 'code-native' }
      },
      runSeed: {
        creativeProtocolVersion: 3,
        assetStrategy: 'none'
      },
      evidenceRequirements: {
        profile: {
          interactionMode: 'direct',
          audioApplicable: true,
          requiredCheckpoints: ['opening', 'core', 'mobile', 'interaction', 'audio']
        }
      }
    });
  });

  it('does not change ordinary sonic editorial copy into a callsign exercise', () => {
    const ordinary = createV2CreativeContract(
      '为一场口述史展览设计以声音和文字排版为主的网页。听众可以试听不同章节，最后保存参观路径。'
    );

    expect(ordinary.experience.beats.map((beat) => beat.id)).not.toContain('callsign-waiting');
  });
});
