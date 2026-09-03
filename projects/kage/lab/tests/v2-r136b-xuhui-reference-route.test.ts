import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  positiveReferenceLibrary,
  selectPositiveReferenceEvidence
} from '../src/v2/reference-intelligence.ts';

export const xuhuiMeetingAtlasBrief = '为第一次去上海徐汇滨江看展、需要与朋友约碰头点的人，设计「西岸集合点图卷」。必须使用项目已有、带 OpenStreetMap 署名的真实徐汇滨江地图与可追溯地标坐标，并把它组织为一张可横向穿行的连续图卷。西岸美术馆、油罐艺术中心、龙美术馆和星美术馆始终落在同一真实底图和同一坐标变换中。访客用滚轮、拖拽、触摸、方向键或上一站/下一站按钮改变同一个横向位置；选择地标后，真实热点、场馆名称、地址和集合卡同步更新。最终行动为「保存集合点卡」。视觉像一张摊开的周末展览折页：纸白、江水蓝、橙红定位针，地图是第一记忆点，信息贴近地点出现。真实区域、场馆名称、地址和坐标承担事实；集合建议与示意步行线必须显式标为产品演示，不提供或暗示实时开放时间。不要 WebGL、Three.js 或生成图；代码只负责语义 DOM、SVG 标记与输入状态。';

describe('R136B Xuhui meeting atlas positive reference route', () => {
  it('pairs grounded map evidence with the horizontal panorama proof for the exact brief', () => {
    const selected = selectPositiveReferenceEvidence(
      xuhuiMeetingAtlasBrief,
      'spatial-exploration'
    );

    expect(selected.map((pack) => pack.id)).toEqual([
      'positive-xuhui-grounded-atlas',
      'positive-moonlit-tidepool-panorama'
    ]);
    expect(selected.map((pack) => pack.macroStructureCategory)).toEqual([
      'editorial-flow',
      'horizontal-panorama'
    ]);
    expect(selected.every((pack) => pack.relevanceReason.includes('命中'))).toBe(true);
    expect(selected.some((pack) => [
      'positive-dream-room-memory',
      'positive-stormglass-programmatic-field',
      'positive-prism-seed-hybrid',
      'positive-community-repair-diagnostic',
      'positive-color-relay-branching'
    ].includes(pack.id))).toBe(false);
  });

  it('keeps a real dream-memory brief routed to the narrowed dream proof', () => {
    const selected = selectPositiveReferenceEvidence(
      '为梦境记录产品设计网页，同一房间里的记忆碎片逐渐清晰，最后记录今晚的梦。',
      'continuous-scroll'
    );

    expect(selected.map((pack) => pack.id)).toContain('positive-dream-room-memory');
  });

  it('binds the grounded atlas pack to inspectable local evidence and honest fallback principles', () => {
    const pack = positiveReferenceLibrary.find((candidate) => (
      candidate.id === 'positive-xuhui-grounded-atlas'
    ));

    expect(pack).toMatchObject({
      category: 'evidence-led-editorial',
      macroStructureCategory: 'editorial-flow',
      source: {
        kind: 'local-runtime',
        uri: 'cases/runs/dedicated-c0514ddead80/',
        evidenceLevel: 'runtime-verified'
      },
      confidence: .99
    });
    expect(pack?.observedMechanism.join('')).toMatch(/同一经纬度投影|同一投影/);
    expect(pack?.positiveBorrowPrinciples.join('')).toMatch(/署名持续可见/);
    expect(pack?.positiveBorrowPrinciples.join('')).toMatch(/事实与产品演示数据|地理事实与产品演示数据/);
    expect(pack?.positiveBorrowPrinciples.join('')).toMatch(/失败|不可用状态/);
    expect(pack?.positiveBorrowPrinciples.join('')).toMatch(/伪造地理证据/);
    for (const artifact of pack?.evidence ?? []) {
      expect(existsSync(resolve(process.cwd(), artifact.uri)), artifact.uri).toBe(true);
    }
  });
});
