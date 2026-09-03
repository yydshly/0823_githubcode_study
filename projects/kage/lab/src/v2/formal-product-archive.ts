import { z } from 'zod';

export const formalProductArchiveEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2),
  summary: z.string().trim().min(12),
  route: z.string().startsWith('/pages/v2/deliveries/'),
  previewUrl: z.string().startsWith('/creative-assets/v2-formal-products/'),
  runId: z.string().trim().min(4),
  bundleHash: z.string().regex(/^[a-f0-9]{64}$/),
  productValue: z.string().trim().min(8),
  journey: z.tuple([
    z.literal('entry'),
    z.literal('use'),
    z.literal('result'),
    z.literal('continuation')
  ]),
  status: z.literal('formal-product')
}).strict();

export type FormalProductArchiveEntry = z.infer<typeof formalProductArchiveEntrySchema>;

export const V2_FORMAL_PRODUCT_ARCHIVE: readonly FormalProductArchiveEntry[] = [
  formalProductArchiveEntrySchema.parse({
    id: 'kage-creative-director',
    title: 'KAGE 创意导演',
    summary: '把一句产品想法发展成有依据的视觉方向，并连接真实案例结果与后续创作入口。',
    route: '/pages/v2/deliveries/kage-creative-director/',
    previewUrl: '/creative-assets/v2-formal-products/kage-creative-director.png',
    runId: 'direct-r162-kage-creative-director',
    bundleHash: 'cca916f2df90b7d6d2d069efac826649399faaa31f9be34aaa338bcd7ea672bd',
    productValue: '证明现有研究能力可以组成进入、使用、结果与继续四阶段产品，而不是停留在单个视觉效果。',
    journey: ['entry', 'use', 'result', 'continuation'],
    status: 'formal-product'
  }),
  formalProductArchiveEntrySchema.parse({
    id: 'rainlight-walk-recorder',
    title: '雨光夜行记录器',
    summary: '写下地点与一句话，用滚轮、拖动或键盘重走雨夜光迹，最终保存为一封私人夜行信笺。',
    route: '/pages/v2/deliveries/rainlight-walk-recorder/',
    previewUrl: '/creative-assets/v2-formal-products/rainlight-walk-recorder.png',
    runId: 'direct-r163-rainlight-walk-recorder',
    bundleHash: '51fcaa3efa5b78525d2f6bc58258d1366508c9480b0be7f664ceadcb786647e4',
    productValue: '证明 V5 能把一个未使用过的外部主题发展为正式素材、真实互动、结果保存和再次编辑组成的完整产品。',
    journey: ['entry', 'use', 'result', 'continuation'],
    status: 'formal-product'
  })
];
