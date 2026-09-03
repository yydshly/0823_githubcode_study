import { z } from 'zod';

export type IdentityEvidenceStateId = 'source' | 'process' | 'performance';

export interface IdentityEvidenceState {
  id: IdentityEvidenceStateId;
  index: number;
  eyebrow: string;
  title: string;
  summary: string;
  proofLabel: string;
  proofValue: string;
  proofDetail: string;
  image: string;
  alt: string;
}

export const identityEvidenceDecisionSchema = z.object({
  selected: z.boolean(),
  score: z.number().min(0).max(100),
  reason: z.string().min(8),
  rejectedBy: z.array(z.string()),
  matchedSignals: z.array(z.string()),
  capabilityId: z.literal('identity-through-evidence').nullable()
}).strict();

export type IdentityEvidenceDecision = z.infer<typeof identityEvidenceDecisionSchema>;

export const identityEvidenceCapability = {
  id: 'identity-through-evidence',
  title: '身份与证据叙事',
  evidenceLevel: 'E4' as 'E3' | 'E4',
  renderer: 'dom-media-hybrid',
  inputs: ['scroll', 'button', 'keyboard'],
  outputs: ['visual-identity', 'subject-focus', 'evidence-type', 'proof-field', 'action-meaning'],
  baseInterface: '品牌、证据文本、阅读顺序和行动在图片失败时仍完整',
  selectionSignals: ['品牌', '身份', '材料', '来源', '过程', '证明', '证据', '研究', '成果', '可信', '档案'],
  rejectionSignals: ['真实 glb', '拆解结构', '自由旋转', '纯氛围', '无需内容'],
  states: [
    {
      id: 'source',
      index: 0,
      eyebrow: 'SOURCE / 01',
      title: '身份从材料的来历开始。',
      summary: '不是先画一个标志，再寻找装饰。NACRE 04 把培育环境、纤维来源和透光纹理直接作为品牌的识别基础。',
      proofLabel: 'ORIGIN / 来源',
      proofValue: '植物纤维 × 菌丝网络',
      proofDetail: '虚构材料研究样例；字段用于验证证据结构，不代表真实商业声明。',
      image: './assets/source.jpg',
      alt: '夜间温室中悬浮发光的纤维种荚'
    },
    {
      id: 'process',
      index: 1,
      eyebrow: 'PROCESS / 02',
      title: '形成过程，就是品牌语法。',
      summary: '空间中的编织、张力和光线不只是背景。它们解释材料如何从局部纤维形成可承载的连续表皮。',
      proofLabel: 'METHOD / 过程',
      proofValue: '生长 · 编织 · 固化',
      proofDetail: '每个动作对应一个可说明的视觉状态，禁止用无意义粒子替代形成机制。',
      image: './assets/process.jpg',
      alt: '温室中由透明纤维编织形成的空间结构'
    },
    {
      id: 'performance',
      index: 2,
      eyebrow: 'PERFORMANCE / 03',
      title: '证明最终回到一个可辨认的主体。',
      summary: '从环境和过程收束为单一标本。轮廓、透光层次和内部脉络共同成为可记忆、可比较的品牌资产。',
      proofLabel: 'RESULT / 表现',
      proofValue: '透光层次 · 连续表皮',
      proofDetail: '视觉结果与证据字段并置；行动指向材料档案，而不是无含义的“立即体验”。',
      image: './assets/performance.jpg',
      alt: '黑色背景上的透明发光纤维种荚标本'
    }
  ] satisfies IdentityEvidenceState[]
};

export function evaluateIdentityEvidenceBrief(brief: string): IdentityEvidenceDecision {
  const normalized = brief.toLowerCase();
  const matched = identityEvidenceCapability.selectionSignals.filter((signal) => normalized.includes(signal));
  const rejectedBy = identityEvidenceCapability.rejectionSignals.filter((signal) => normalized.includes(signal));
  const score = Math.min(100, matched.length * 18);
  const selected = matched.length >= 2 && rejectedBy.length === 0;
  return identityEvidenceDecisionSchema.parse({
    selected,
    score,
    rejectedBy,
    matchedSignals: matched,
    capabilityId: selected ? identityEvidenceCapability.id : null,
    reason: selected
      ? `命中 ${matched.join('、')}；需要让身份、主体和证明内容共同建立可信度。`
      : rejectedBy.length
        ? `拒绝：${rejectedBy.join('、')} 不属于当前能力证明范围。`
        : '拒绝：缺少同时指向身份与证据的明确目标。'
  });
}
