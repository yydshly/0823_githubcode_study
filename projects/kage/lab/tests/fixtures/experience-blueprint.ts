import type { ModelInterpretation } from '../../server/model-schema';

export function modelBlueprint(effectSpecId: string, index: number): ModelInterpretation['experienceBlueprints'][number] {
  const accent = index % 2 ? '#ffb36b' : '#83ddff';
  const chapter = (id: string, step: number) => ({
    id,
    navLabel: step ? '抵达' : '开场',
    kicker: step ? 'RESOLVE' : 'ESTABLISH',
    title: step ? '让核心证据形成记忆' : '从一片流动空间进入主题',
    paragraphs: ['章节内容、镜头和场景状态都由本次模型蓝图直接编排。'],
    type: step ? 'cta' as const : 'hero' as const,
    layout: step ? 'center' as const : 'left' as const,
    spanVh: 140,
    overlay: { kind: 'metric' as const, value: step ? '02' : '01', caption: '模型编排章节' },
    camera: {
      from: { eye: [step ? -3 : 5, 3 + step, 14 - step] as [number, number, number], look: [0, 1, 0] as [number, number, number], fov: 46 },
      to: { eye: [step ? 0 : 2, 5 + step, 10 - step] as [number, number, number], look: [0, 1, 0] as [number, number, number], fov: 42 }
    },
    scene: {
      from: { assembly: .2 + step * .4, energy: .2 + step * .3, density: .3 + step * .3, fog: .7 - step * .4, accent, focus: `${effectSpecId}-${step}-from` },
      to: { assembly: .55 + step * .4, energy: .55 + step * .35, density: .6 + step * .3, fog: .35 - step * .2, accent, focus: `${effectSpecId}-${step}-to` }
    }
  });
  return {
    schemaVersion: 1,
    id: `${effectSpecId}-page`,
    effectSpecId,
    title: `${effectSpecId} 页面`,
    summary: '由模型直接决定章节、镜头、场景状态和页面内容。',
    scenePlugin: index % 2 ? 'signal-world' : 'composed-world',
    presentation: { brandLabel: 'SIGNAL', footerLabel: 'CONTINUE', footerCopy: '继续探索这段空间叙事。' },
    chapters: [chapter(`${effectSpecId}-opening`, 0), chapter(`${effectSpecId}-resolve`, 1)]
  };
}
