import type { GeneratedExperienceBundle } from './generated-experience-bundle.ts';
import type { V2CreativeContract } from '../v2/creative-contract.ts';

export interface MediaDominanceAsset {
  id: string;
  kind: 'image' | 'texture' | 'environment' | 'model-3d' | 'audio' | 'video' | 'font';
  qualityLevel?: 'L2-inspectable' | 'L3-presentable' | 'L4-cinematic';
  required?: boolean;
}

export interface MediaDominanceAssessment {
  schemaVersion: 1;
  decision: 'ready' | 'blocked';
  route: V2CreativeContract['direction']['renderer']['route'] | 'unknown';
  highQualityAssetIds: string[];
  subjectPrimitiveCount: number;
  subjectPrimitiveScore: number;
  constructors: Record<string, number>;
  summary: string;
}

const primitiveWeights = {
  BoxGeometry: 3,
  SphereGeometry: 3,
  CapsuleGeometry: 3,
  ConeGeometry: 2,
  CylinderGeometry: 1,
  TorusGeometry: 2,
  TorusKnotGeometry: 4,
  LatheGeometry: 4,
  ExtrudeGeometry: 3,
  DodecahedronGeometry: 3,
  IcosahedronGeometry: 3,
  OctahedronGeometry: 3,
  TetrahedronGeometry: 3,
} as const;

export function assessMediaDominance(input: {
  creativeContract?: V2CreativeContract;
  assets?: readonly MediaDominanceAsset[];
  bundle: GeneratedExperienceBundle;
}): MediaDominanceAssessment {
  const route = input.creativeContract?.direction.renderer.route || 'unknown';
  const highQualityAssets = (input.assets || []).filter((asset) =>
    (asset.kind === 'image' || asset.kind === 'environment' || asset.kind === 'video')
    && (asset.qualityLevel === 'L3-presentable' || asset.qualityLevel === 'L4-cinematic')
  );
  const constructors: Record<string, number> = {};
  const source = input.bundle.files
    .filter((file) => file.language === 'typescript')
    .map((file) => file.content)
    .join('\n');

  let subjectPrimitiveCount = 0;
  let subjectPrimitiveScore = 0;
  for (const [name, weight] of Object.entries(primitiveWeights)) {
    const count = [...source.matchAll(new RegExp(`new\\s+THREE\\.${name}\\s*\\(`, 'g'))].length;
    if (!count) continue;
    constructors[name] = count;
    subjectPrimitiveCount += count;
    subjectPrimitiveScore += count * weight;
  }

  const mediaLed = route === 'dom-media-hybrid' || route === 'dom-canvas-hybrid' || route === 'dom-only';
  const repeatedOpaqueSubjectBlocks = (constructors.BoxGeometry || 0) >= 2;
  const replacesApprovedSubject = mediaLed
    && highQualityAssets.length > 0
    && (repeatedOpaqueSubjectBlocks || subjectPrimitiveScore >= 6);

  if (replacesApprovedSubject) {
    const constructorSummary = Object.entries(constructors).map(([name, count]) => `${name}×${count}`).join('、');
    return {
      schemaVersion: 1,
      decision: 'blocked',
      route,
      highQualityAssetIds: highQualityAssets.map((asset) => asset.id),
      subjectPrimitiveCount,
      subjectPrimitiveScore,
      constructors,
      summary: `媒体主导权门禁拒绝：${highQualityAssets.length} 个 L3/L4 主素材已经承担主体或环境，但代码又使用 ${constructorSummary} 重建高权重几何主体。请让获批素材持续为第一视觉主角；Three.js 仅保留背景平面、遮罩、景深、受力标注或其他视觉从属增强。`,
    };
  }

  return {
    schemaVersion: 1,
    decision: 'ready',
    route,
    highQualityAssetIds: highQualityAssets.map((asset) => asset.id),
    subjectPrimitiveCount,
    subjectPrimitiveScore,
    constructors,
    summary: mediaLed && highQualityAssets.length
      ? '媒体主导权门禁通过：L3/L4 素材保持主导，程序化几何没有达到主体重建阈值。'
      : '媒体主导权门禁不适用：当前不是具备 L3/L4 主素材的媒体主导路线。',
  };
}

export function assertMediaDominance(input: Parameters<typeof assessMediaDominance>[0]): MediaDominanceAssessment {
  const assessment = assessMediaDominance(input);
  if (assessment.decision === 'blocked') throw new Error(assessment.summary);
  return assessment;
}
