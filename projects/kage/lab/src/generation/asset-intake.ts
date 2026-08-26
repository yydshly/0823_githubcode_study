import { z } from 'zod';
import { assetModalitySchema } from './effect-spec';

export const userAssetImportRequestSchema = z.object({
  schemaVersion: z.literal(1),
  brief: z.string().trim().min(8).max(600),
  fileName: z.string().trim().min(1).max(160)
    .refine((value) => !/[\\/\0]/.test(value), '素材文件名不能包含路径字符。'),
  contentType: z.string().trim().min(3).max(100),
  dataBase64: z.string().min(8).max(27_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  role: z.string().trim().min(2).max(120).optional()
}).strict();

export const importedUserAssetSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  requirementId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  uri: z.string().regex(/^\/api\/creative\/assets\/[a-z0-9-]+$/),
  bundlePath: z.string().regex(/^assets\/[a-zA-Z0-9_.-]+$/),
  kind: z.enum(['image', 'model-3d', 'audio', 'video']),
  modality: assetModalitySchema,
  source: z.literal('user-provided'),
  role: z.string().min(2).max(120),
  description: z.string().min(4).max(300),
  payloadBytes: z.number().int().positive().max(20_000_000),
  qualityLevel: z.literal('L2-inspectable'),
  publishable: z.literal(false),
  license: z.null(),
  evidence: z.array(z.string().min(2)).min(2)
}).strict();

export type UserAssetImportRequest = z.infer<typeof userAssetImportRequestSchema>;
export type ImportedUserAsset = z.infer<typeof importedUserAssetSchema>;
