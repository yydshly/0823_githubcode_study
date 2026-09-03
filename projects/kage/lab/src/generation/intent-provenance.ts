import { z } from 'zod';

export const intentSubmissionSourceSchema = z.enum([
  'workbench-user',
  'api-client',
  'system-validation'
]);

export const intentProvenanceSchema = z.object({
  schemaVersion: z.literal(1),
  rawUserBrief: z.string().trim().min(8).max(600),
  submissionSource: intentSubmissionSourceSchema,
  userConstraints: z.array(z.string().min(2).max(180)).max(8),
  systemPreferences: z.array(z.string().min(4).max(180)).min(1).max(4),
  experimentConstraints: z.array(z.string().min(2).max(180)).max(6),
  assetPolicy: z.literal('quality-first')
}).strict();

export type IntentSubmissionSource = z.infer<typeof intentSubmissionSourceSchema>;
export type IntentProvenance = z.infer<typeof intentProvenanceSchema>;

export function createIntentProvenance(
  rawUserBrief: string,
  submissionSource: IntentSubmissionSource,
  experimentConstraints: readonly string[] = []
): IntentProvenance {
  return intentProvenanceSchema.parse({
    schemaVersion: 1,
    rawUserBrief,
    submissionSource,
    userConstraints: extractExplicitUserConstraints(rawUserBrief),
    systemPreferences: [
      '以最终呈现质量选择模型素材、项目素材、DOM、Canvas 或 Three.js，不预先禁用实现手段。',
      '系统推导只能作为实现建议，不能新增用户没有提出的硬限制。'
    ],
    experimentConstraints: [...experimentConstraints],
    assetPolicy: 'quality-first'
  });
}

export function extractExplicitUserConstraints(brief: string): string[] {
  return brief
    .split(/[。；;\n]/)
    .map((item) => item.trim())
    .filter((item) => /(?:不要|避免|禁止|必须|不能|不使用|不依赖|无需)/.test(item))
    .slice(0, 8);
}
