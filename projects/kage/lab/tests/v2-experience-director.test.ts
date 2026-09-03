import { describe, expect, it } from 'vitest';
import { buildV2AuthoringPrompt, createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { directExperience } from '../src/v2/experience-director.ts';

describe('V2 evidence-guided experience director', () => {
  it('routes a dream environment through an aperture and state storyboard without forcing Three.js', () => {
    const contract = createV2CreativeContract(
      '为一款梦境记录产品设计网页。开场是刚醒来的模糊房间，滚动时记忆逐渐形成，最后记录今晚的梦。安静、真实。'
    );

    expect(contract.direction.visualRole).toBe('environment');
    expect(contract.direction.mechanisms.map((item) => item.id))
      .toEqual(expect.arrayContaining(['environmental-aperture', 'state-storyboard']));
    expect(contract.direction.renderer.route).toBe('dom-media-hybrid');
    expect(contract.direction.renderer.enhancement).toBe('media');
    expect(contract.direction.interaction.pointerRole).toBe('secondary');
    expect(contract.direction.rejectedMechanisms.map((item) => item.id))
      .toContain('cinematic-3d-deconstruction');
  });

  it('gives a transparent material subject a safe specimen field and local Canvas route', () => {
    const contract = createV2CreativeContract(
      '为一个先锋时装品牌设计网页，透明薄纱材质逐渐形成完整服装，最后进入系列。克制、真实。'
    );

    expect(contract.direction.visualRole).toBe('subject');
    expect(contract.direction.mechanisms[0]?.id).toBe('subject-specimen-field');
    expect(contract.direction.mechanisms.map((item) => item.id)).not.toContain('branded-media-mask');
    expect(contract.direction.renderer.route).toBe('dom-canvas-hybrid');
    expect(contract.direction.renderer.threeJustification).toContain('不要求可检查的三维几何');
  });

  it('treats a memory-themed exhibition as spatial evidence, not a dream room', () => {
    const contract = createV2CreativeContract(
      '为海洋记忆数字展陈设计网页，需要档案证据、空间关系和可以选择的探索路径，最终引导开始探索。'
    );

    expect(contract.experience.pattern).toBe('spatial-exploration');
    expect(contract.direction.mechanisms.map((item) => item.id)).toContain('sticky-archive-stack');
    expect(contract.direction.interaction.primaryInput).toBe('direct-navigation');
  });

  it('uses Three.js only when a real model must expose spatial structure', () => {
    const contract = createV2CreativeContract(
      '为声学设备设计产品网页，必须使用真实 GLB 拆解内部结构，并允许自由旋转检查。'
    );

    expect(contract.direction.visualRole).toBe('spatial-object');
    expect(contract.direction.mechanisms.map((item) => item.id))
      .toContain('cinematic-3d-deconstruction');
    expect(contract.direction.renderer.route).toBe('dom-three-hybrid');
    expect(contract.direction.renderer.enhancement).toBe('three-webgl');
    expect(contract.direction.interaction.primaryInput).toBe('direct-navigation');
  });

  it('selects pointer reveal only when the input itself has discovery meaning', () => {
    const decision = directExperience({
      brief: '为艺术档案设计可探索网页，通过鼠标聚光发现并选择不同作品。',
      pattern: 'editorial-field',
      assets: [{ role: 'information', modality: 'transparent-image', required: true }],
      beatCount: 3
    });

    expect(decision.mechanisms.map((item) => item.id)).toContain('pointer-reveal');
    expect(decision.interaction.primaryInput).toBe('pointer');
    expect(decision.interaction.touchAlternative).toContain('点击选择');
    expect(decision.interaction.keyboardAlternative).toContain('焦点');
  });

  it('routes explicit floor and time selection to semantic navigation plus a programmatic floor plan', () => {
    const contract = createV2CreativeContract(
      '为社区公共图书馆设计网页。用户选择楼层和时段后，同步查看采光、噪声与座位可用率，并在平面图中高亮对应区域。'
    );

    expect(contract.direction.interaction.primaryInput).toBe('direct-navigation');
    expect(contract.direction.renderer.route).toBe('dom-canvas-hybrid');
    expect(contract.technical.semanticInteraction.selected).toBe(true);
  });

  it('routes an environmental cause-and-effect section through a shared Three.js coordinate system', () => {
    const contract = createV2CreativeContract(
      '持续展示同一段真实感街道树冠与路面剖面，调整树冠密度和浇水量时同步改变树荫范围、路面温度和蒸腾说明。'
    );

    expect(contract.direction.renderer.route).toBe('dom-three-hybrid');
    expect(contract.direction.renderer.threeJustification).toContain('同一场景坐标');
    expect(contract.direction.interaction.primaryInput).toBe('direct-navigation');
  });

  it('keeps the execution-critical director decision inside the Codex authoring input', () => {
    const contract = createV2CreativeContract(
      '为梦境记录产品设计连续滚动网页，同一房间逐渐清晰，最后开始记录。'
    );
    const prompt = buildV2AuthoringPrompt(contract);

    expect(prompt).toContain('"direction"');
    expect(prompt).toContain('"visualRole":"environment"');
    expect(prompt).toContain('environmental-aperture');
    expect(prompt).toContain('"rejected"');
    expect(prompt).toContain('编码前的视觉导演决策');
  });
});
