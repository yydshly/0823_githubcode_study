import { z } from 'zod';

export const creativeInstructionSourceSchema = z.enum([
  'user',
  'quality',
  'reference',
  'inference'
]);

export const creativeInstructionScopeSchema = z.enum([
  'current-run',
  'project-quality'
]);

export const creativeInstructionStrengthSchema = z.enum([
  'hard',
  'advisory'
]);

export const creativeInstructionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  content: z.string().min(2),
  source: creativeInstructionSourceSchema,
  scope: creativeInstructionScopeSchema,
  strength: creativeInstructionStrengthSchema,
  rationale: z.string().min(4).optional()
}).strict().superRefine((instruction, context) => {
  if (instruction.source === 'user') {
    if (instruction.scope !== 'current-run' || instruction.strength !== 'hard') {
      context.addIssue({
        code: 'custom',
        message: '用户要求只能作为当前任务的硬约束。'
      });
    }
    return;
  }

  if (instruction.source === 'quality') {
    if (instruction.scope !== 'project-quality' || instruction.strength !== 'hard') {
      context.addIssue({
        code: 'custom',
        message: '通用质量门只能作为项目级硬约束。'
      });
    }
    return;
  }

  if (instruction.scope !== 'current-run' || instruction.strength !== 'advisory') {
    context.addIssue({
      code: 'custom',
      message: '案例与系统推断只能作为当前任务的软建议。'
    });
  }
});

export type CreativeInstruction = z.infer<typeof creativeInstructionSchema>;

const universalQualityGates = [
  {
    id: 'quality-runnable-accessible',
    content: '最终网页必须可运行，并在桌面、移动端、减弱动效和增强能力失败时保留可读可操作的核心路径。',
    rationale: '这是跨风格的交付可用性要求。'
  },
  {
    id: 'quality-truthful-assets-data',
    content: '不得伪造不存在的素材、模型、业务数据或专业结论；模拟和估算必须清楚标注。',
    rationale: '这是跨主题的真实性要求。'
  },
  {
    id: 'quality-causal-finished',
    content: '最终浏览器画面必须形成清楚焦点与完成态；主要交互必须造成可辨认的主体变化和业务结果，交付画面不得残留调试标记。',
    rationale: '这是优秀成品的最低质量门，不指定任何视觉风格。'
  }
] as const;

export function createUniversalQualityInstructions(): CreativeInstruction[] {
  return universalQualityGates.map((gate) => creativeInstructionSchema.parse({
    ...gate,
    source: 'quality',
    scope: 'project-quality',
    strength: 'hard'
  }));
}

export function createUserConstraintInstructions(constraints: readonly string[]): CreativeInstruction[] {
  return constraints.map((content, index) => creativeInstructionSchema.parse({
    id: `user-constraint-${index + 1}`,
    content,
    source: 'user',
    scope: 'current-run',
    strength: 'hard',
    rationale: '来自当前用户 brief 的显式要求，不继承到其他任务。'
  }));
}

export function createReferenceAdvisoryInstructions(references: readonly {
  referenceId: string;
  title: string;
  borrow: readonly string[];
  avoid: readonly string[];
}[]): CreativeInstruction[] {
  return references.flatMap((reference, index) => {
    const borrow = reference.borrow.filter(Boolean).join('；');
    const boundary = reference.avoid.filter(Boolean).join('；');
    return [creativeInstructionSchema.parse({
      id: `reference-${index + 1}`,
      content: [
        `可参考「${reference.title}」的已验证原理：${borrow}`,
        boundary ? `其案例边界仅用于避免照搬：${boundary}` : ''
      ].filter(Boolean).join('。'),
      source: 'reference',
      scope: 'current-run',
      strength: 'advisory',
      rationale: `案例 ${reference.referenceId} 提供正向启发，不能覆盖当前 brief 或升级为禁令。`
    })];
  });
}

export function createInferenceAdvisoryInstruction(input: {
  experienceForm: string;
  fingerprint: Record<string, string>;
  rationale: string;
}): CreativeInstruction {
  return creativeInstructionSchema.parse({
    id: 'inference-creative-direction',
    content: `建议从 ${input.experienceForm} 出发，并将 ${Object.values(input.fingerprint).join('、')} 作为候选视觉方向；可为更好的主题表达调整或放弃。`,
    source: 'inference',
    scope: 'current-run',
    strength: 'advisory',
    rationale: input.rationale
  });
}
