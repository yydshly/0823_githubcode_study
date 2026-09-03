import { describe, expect, it } from 'vitest';
import { assessProductExperienceQuality } from '../src/generation/product-experience-quality.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

export const r136bWestBundPanoramaBrief = '为第一次去上海徐汇滨江看展、需要与朋友约碰头点的人，设计「西岸集合点图卷」。必须使用项目已有、带 OpenStreetMap 署名的真实徐汇滨江地图与可追溯地标坐标，并把它组织为一张可横向穿行的连续图卷。西岸美术馆、油罐艺术中心、龙美术馆和星美术馆始终落在同一真实底图和同一坐标变换中。访客用滚轮、拖拽、触摸、方向键或上一站/下一站按钮改变同一个横向位置；选择地标后，真实热点、场馆名称、地址和集合卡同步更新。最终行动为「保存集合点卡」。视觉像一张摊开的周末展览折页：纸白、江水蓝、橙红定位针，地图是第一记忆点，信息贴近地点出现。真实区域、场馆名称、地址和坐标承担事实；集合建议与示意步行线必须显式标为产品演示，不提供或暗示实时开放时间。不要 WebGL、Three.js 或生成图；代码只负责语义 DOM、SVG 标记与输入状态。';

describe('R136B West Bund horizontal-panorama contract routing', () => {
  it('keeps the exact grounded map brief on one horizontal panorama despite drag and save signals', () => {
    const contract = createV2CreativeContract(r136bWestBundPanoramaBrief);
    const summary = summarizeV2CreativeContract(contract);
    const productSummary = assessProductExperienceQuality(contract);

    expect(contract.experience).toMatchObject({
      pattern: 'editorial-field',
      structure: {
        mode: 'horizontal-panorama',
        segmentPolicy: 'content-derived'
      }
    });
    expect(contract.experience.structure.layoutRule).toMatch(/真实地图.*同一横向位置/);
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'panorama-opening',
      'panorama-traverse',
      'panorama-landmark',
      'panorama-action'
    ]);
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'horizontal-panorama',
      workbenchPolicy: 'forbidden',
      surfaceArchetype: 'civic-data',
      controlVisibility: 'contextual',
      interactionStyle: 'mixed'
    });
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'map-evidence-field',
      required: true,
      fallback: 'block'
    }));
    expect(summary).toMatchObject({
      structureMode: 'horizontal-panorama',
      storyBeatCount: 4
    });
    expect(summary.styleDifference).toContain('横向连续图卷');
    expect(productSummary).toMatchObject({
      status: 'pending',
      structureMode: 'horizontal-panorama',
      expectedStateCount: 4
    });
    expect(productSummary.summary).toContain('横向连续图卷');
  });

  it('generalizes the same structure contract to a grounded panorama in another city', () => {
    const contract = createV2CreativeContract(
      '为第一次到南京秦淮河散步的人设计会合地图。使用带署名的真实南京地图与可追溯地标坐标，把夫子庙、中华门和老门东组织在同一张连续地图长卷里。访客左右拖动、触摸或用方向键横向浏览同一地图；选择地标后，真实热点、地点介绍和会合结果同步更新，最后保存碰头点。路线建议明确标为产品演示。'
    );

    expect(contract.experience.structure.mode).toBe('horizontal-panorama');
    expect(contract.technical.styleDiversity.structureDirection.experienceForm)
      .toBe('horizontal-panorama');
    expect(summarizeV2CreativeContract(contract).structureMode).toBe('horizontal-panorama');
    expect(JSON.stringify({
      experience: contract.experience,
      assets: contract.assets,
      style: contract.technical.styleDiversity.structureDirection
    })).not.toMatch(/徐汇|西岸美术馆|油罐艺术中心|龙美术馆|星美术馆|四个地标/);
  });

  it.each([
    '为城市公共饮水点设计明亮地图，选择站点后更新路线、距离和开放状态。',
    '为杭州公共图书馆设计地点地图。使用带署名的真实杭州地图与可追溯站点坐标，所有站点保持在同一张地图中；选择站点后更新地址、距离和开放状态。'
  ])('keeps an ordinary map without horizontal intent on the existing interactive field route: %s', (brief) => {
    const contract = createV2CreativeContract(brief);

    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.technical.styleDiversity.structureDirection.experienceForm).toBe('spatial-atlas');
    expect(summarizeV2CreativeContract(contract).structureMode).toBe('interactive-field');
  });
});
