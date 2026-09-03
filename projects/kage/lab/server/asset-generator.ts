import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assetProductionReportSchema, compileAssetPrompt, producibleImageRequirements, type AssetProductionReport, type AssetProductionRequest } from '../src/generation/asset-production.ts';
import { importedUserAssetSchema, userAssetImportRequestSchema, type ImportedUserAsset } from '../src/generation/asset-intake.ts';
import type { AssetCandidate } from '../src/generation/asset-plan.ts';
import { stableHash } from '../src/generation/stable-hash.ts';
import { decideImageAssetUse } from '../src/generation/asset-use-policy.ts';
import { assertGenerationDeadline, clampTimeoutToGenerationDeadline } from './generation-deadline.ts';
import {
  assertImageAssetFitness,
  inspectImageAsset,
  inspectionMatchesBytes,
  type ImageAssetFitnessContext,
  type ImageAssetInspection,
} from './image-asset-inspection.ts';

type Environment = Readonly<Record<string, string | undefined>>;

interface MiniMaxImageResponse {
  data?: { image_base64?: string[] };
  base_resp?: { status_code?: number; status_msg?: string };
}

interface StoredAssetMetadata {
  id: string;
  contentType: string;
  fileName: string;
  candidate: AssetCandidate;
  inspection?: ImageAssetInspection;
  intake?: {
    role: string;
    description: string;
    experience?: ImportedUserAsset['experience'];
  };
}

export interface CachedUserAssetDescriptor {
  id: string;
  uri: string;
  bundlePath: string;
  kind: 'image' | 'model-3d' | 'audio' | 'video';
  source: 'user-provided';
  qualityLevel: 'L2-inspectable';
  role: string;
  description: string;
  payloadBytes: number;
  features?: AssetCandidate['features'];
  experience?: ImportedUserAsset['experience'];
}

export async function generateAssets(
  request: AssetProductionRequest,
  environment: Environment = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<AssetProductionReport> {
  const apiKey = environment.MINIMAX_API_KEY;
  if (!apiKey) throw new Error('MiniMax 图片生成不可用：缺少 MINIMAX_API_KEY。');
  const requirements = producibleImageRequirements(request.effectSpec);
  if (!requirements.length) throw new Error(decideImageAssetUse(request.effectSpec).summary);
  const model = environment.MINIMAX_IMAGE_MODEL || 'image-01';
  const root = assetCacheRoot(environment);
  await mkdir(root, { recursive: true });
  const assets: AssetProductionReport['assets'] = [];
  let hits = 0;
  let misses = 0;
  let totalPayloadBytes = 0;
  const totalBudget = Math.min(request.effectSpec.constraints.maxInitialAssetBytes || 8_000_000, 24_000_000);

  for (const [index, requirement] of requirements.slice(0, 2).entries()) {
    assertGenerationDeadline(environment);
    const prompt = compileAssetPrompt(request.brief, request.effectSpec, requirement);
    const id = `asset-${stableHash(`${request.effectSpec.id}|${requirement.id}|${request.seed}|${model}|${prompt}`)}`;
    const cachedMetadata = await readMetadata(root, id);
    const cached = cachedMetadata
      ? await readValidatedStoredAsset(root, cachedMetadata, imageFitnessContext(requirement.role, requirement.experience?.integration))
      : null;
    if (cached) {
      if (totalPayloadBytes + cached.metadata.candidate.payloadBytes > totalBudget) {
        throw new Error(`复用素材 ${requirement.id} 后总负载将超过当前首屏预算 ${totalBudget} 字节。`);
      }
      totalPayloadBytes += cached.metadata.candidate.payloadBytes;
      hits += 1;
      assets.push({ ...cached.metadata.candidate, evidence: [...cached.metadata.candidate.evidence, '复用了相同 EffectSpec、素材需求、模型与 seed 的本地物化缓存；内容哈希和像素检查仍然有效。'] });
      continue;
    }
    misses += 1;
    const base64 = await callMiniMaxImage({ apiKey, model, prompt, seed: request.seed + index, fetchImpl, environment });
    const bytes = Buffer.from(base64, 'base64');
    const inspection = await inspectImageAsset(bytes);
    assertImageAssetFitness(inspection, imageFitnessContext(requirement.role, requirement.experience?.integration));
    const format = imageFormat(inspection);
    if (totalPayloadBytes + bytes.byteLength > totalBudget) throw new Error(`生成素材 ${requirement.id} 后总负载将超过当前首屏预算 ${totalBudget} 字节。`);
    totalPayloadBytes += bytes.byteLength;
    const fileName = `${id}.${format.extension}`;
    const candidate: AssetProductionReport['assets'][number] = {
      requirementId: requirement.id,
      modality: requirement.modality,
      qualityLevel: 'L2-inspectable',
      source: 'model-generated',
      uri: `/api/creative/assets/${id}`,
      license: 'MiniMax API generated output; provenance recorded; publication review required',
      payloadBytes: bytes.byteLength,
      publishable: false,
      features: { alpha: inspection.alpha, depth: 'none' },
      evidence: [
        `MiniMax ${model} 根据 EffectSpec 生成并物化。`,
        `已完整解码 ${inspection.width}×${inspection.height} ${inspection.format.toUpperCase()}，实测 alpha=${inspection.alpha}。`,
        '已通过像素完整性、合成适配、负载预算和浏览器可寻址检查；尚未通过语义、审美与发布审核。'
      ]
    };
    await writeAtomically(join(root, fileName), bytes);
    await writeAtomically(join(root, `${id}.json`), Buffer.from(JSON.stringify({ id, contentType: format.contentType, fileName, candidate, inspection } satisfies StoredAssetMetadata), 'utf8'));
    assets.push(candidate);
  }

  const unsupportedRequirementIds = request.effectSpec.assetRequirements
    .filter((item) => !requirements.some((candidate) => candidate.id === item.id))
    .map((item) => item.id);
  const status: AssetProductionReport['status'] = assets.length === 0 ? 'blocked' : unsupportedRequirementIds.length ? 'partial' : 'ready';
  return assetProductionReportSchema.parse({
    schemaVersion: 1,
    id: `production-${stableHash(`${request.effectSpec.id}|${request.seed}|${model}`)}`,
    provider: 'minimax', model, status, assets, unsupportedRequirementIds,
    cache: { hits, misses },
    messages: [
      `已物化 ${assets.length} 个模型素材；质量保持 L2-inspectable，等待真实页面视觉评审。`,
      unsupportedRequirementIds.length ? `${unsupportedRequirementIds.length} 个非图片需求未由此适配器处理。` : '所有声明的图片类需求均已生成。'
    ]
  });
}

export async function importUserAsset(
  value: unknown,
  environment: Environment = process.env
): Promise<ImportedUserAsset> {
  const request = userAssetImportRequestSchema.parse(value);
  const bytes = Buffer.from(request.dataBase64, 'base64');
  const normalizedInput = request.dataBase64.replace(/=+$/, '');
  const normalizedBytes = bytes.toString('base64').replace(/=+$/, '');
  if (normalizedInput !== normalizedBytes) throw new Error('素材数据不是规范 Base64。');
  if (bytes.byteLength > 20_000_000) throw new Error('素材超过 20 MB 接入上限。');
  const format = await inspectUserAsset(
    bytes,
    request.fileName,
    imageFitnessContext(request.role, request.experience?.integration),
  );
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const id = `asset-${hash}`;
  const fileName = `${id}.${format.extension}`;
  const role = request.role || `用户提供的 ${format.modality} 主体`;
  const description = `${format.label}${format.inspection ? ` ${format.inspection.width}×${format.inspection.height}` : ''} · L2 可检查资产 · 上传文件 ${request.fileName}`;
  const candidate: AssetCandidate = {
    requirementId: `uploaded-${format.modality}`,
    modality: format.modality,
    qualityLevel: 'L2-inspectable',
    source: 'user-supplied',
    uri: `/api/creative/assets/${id}`,
    license: null,
    payloadBytes: bytes.byteLength,
    publishable: false,
    ...(format.inspection ? { features: { alpha: format.inspection.alpha, depth: 'none' as const } } : {}),
    evidence: [
      `用户上传 ${request.fileName}，已验证为 ${format.label}。`,
      ...(format.inspection ? [`已完整解码 ${format.inspection.width}×${format.inspection.height}，实测 alpha=${format.inspection.alpha}。`] : []),
      '已通过结构检查、20 MB 负载上限和本地可寻址检查；尚未通过语义、审美质量与发布权利审核。'
    ]
  };
  const root = assetCacheRoot(environment);
  await mkdir(root, { recursive: true });
  await writeAtomically(join(root, fileName), bytes);
  await writeAtomically(join(root, `${id}.json`), Buffer.from(JSON.stringify({
    id,
    contentType: format.contentType,
    fileName,
    candidate,
    ...(format.inspection ? { inspection: format.inspection } : {}),
    intake: {
      role,
      description,
      ...(request.experience ? { experience: request.experience } : {})
    }
  } satisfies StoredAssetMetadata), 'utf8'));
  return importedUserAssetSchema.parse({
    id,
    requirementId: candidate.requirementId,
    uri: candidate.uri,
    bundlePath: `assets/${fileName}`,
    kind: format.kind,
    modality: format.modality,
    source: 'user-provided',
    role,
    description,
    payloadBytes: bytes.byteLength,
    qualityLevel: 'L2-inspectable',
    publishable: false,
    license: null,
    evidence: candidate.evidence,
    ...(candidate.features ? { features: candidate.features } : {}),
    ...(request.experience ? { experience: request.experience } : {})
  });
}

interface UserAssetFormat {
  extension: 'png' | 'jpg' | 'glb' | 'mp3' | 'wav' | 'mp4' | 'webm';
  contentType: string;
  kind: ImportedUserAsset['kind'];
  modality: ImportedUserAsset['modality'];
  label: string;
  inspection?: ImageAssetInspection;
}

async function inspectUserAsset(
  bytes: Buffer,
  originalName: string,
  context: ImageAssetFitnessContext,
): Promise<UserAssetFormat> {
  const extension = originalName.toLocaleLowerCase().split('.').at(-1) || '';
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
    const inspection = await inspectImageAsset(bytes);
    const expected = extension === 'png' ? 'png' : 'jpeg';
    if (inspection.format !== expected) throw new Error('素材扩展名与解码后的图片格式不匹配。');
    assertImageAssetFitness(inspection, context);
    const format = imageFormat(inspection);
    return {
      extension: format.extension,
      contentType: format.contentType,
      kind: 'image',
      modality: 'image',
      label: inspection.format === 'png' ? 'PNG 图片' : 'JPEG 图片',
      inspection,
    };
  }
  if (extension === 'glb' && bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'glTF' && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.byteLength) {
    return { extension: 'glb', contentType: 'model/gltf-binary', kind: 'model-3d', modality: 'model-3d', label: 'GLB 2.0 模型' };
  }
  if (extension === 'mp3' && bytes.length >= 3 && (bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))) {
    return { extension: 'mp3', contentType: 'audio/mpeg', kind: 'audio', modality: 'audio', label: 'MP3 音频' };
  }
  if (extension === 'wav' && bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE') {
    return { extension: 'wav', contentType: 'audio/wav', kind: 'audio', modality: 'audio', label: 'WAV 音频' };
  }
  if (extension === 'mp4' && bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp') {
    return { extension: 'mp4', contentType: 'video/mp4', kind: 'video', modality: 'video', label: 'MP4 视频' };
  }
  if (extension === 'webm' && bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { extension: 'webm', contentType: 'video/webm', kind: 'video', modality: 'video', label: 'WebM 视频' };
  }
  throw new Error('素材扩展名与文件签名不匹配；支持 PNG、JPEG、GLB 2.0、MP3、WAV、MP4 和 WebM。');
}

export async function readGeneratedAsset(id: string, environment: Environment = process.env): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!/^asset-[a-z0-9]+$/.test(id)) return null;
  const root = assetCacheRoot(environment);
  const metadata = await readMetadata(root, id);
  if (!metadata) return null;
  const validated = await readValidatedStoredAsset(root, metadata);
  return validated ? { bytes: validated.bytes, contentType: validated.metadata.contentType } : null;
}

export async function readCachedUserAsset(
  id: string,
  environment: Environment = process.env,
  requiredFitness: ImageAssetFitnessContext = {},
): Promise<CachedUserAssetDescriptor | null> {
  if (!/^asset-[a-z0-9]+$/.test(id)) return null;
  const root = assetCacheRoot(environment);
  const metadata = await readMetadata(root, id);
  if (!metadata || metadata.candidate.source !== 'user-supplied') return null;
  const validated = await readValidatedStoredAsset(
    root,
    metadata,
    {
      ...imageFitnessContext(metadata.intake?.role, metadata.intake?.experience?.integration),
      ...requiredFitness,
    },
  );
  if (!validated) return null;
  const kind = importedKind(validated.metadata.candidate.modality);
  if (!kind) return null;
  return {
    id,
    uri: `/api/creative/assets/${id}`,
    bundlePath: `assets/${validated.metadata.fileName}`,
    kind,
    source: 'user-provided',
    qualityLevel: 'L2-inspectable',
    role: validated.metadata.intake?.role || `用户确认的 ${validated.metadata.candidate.modality} 素材`,
    description: validated.metadata.intake?.description || '已通过结构与本地可寻址检查；绑定到任务后仍需接受最终浏览器视觉验收。',
    payloadBytes: validated.metadata.candidate.payloadBytes,
    ...(validated.metadata.candidate.features ? { features: validated.metadata.candidate.features } : {}),
    ...(validated.metadata.intake?.experience ? { experience: validated.metadata.intake.experience } : {})
  };
}

function importedKind(modality: AssetCandidate['modality']): CachedUserAssetDescriptor['kind'] | null {
  if (modality === 'model-3d') return 'model-3d';
  if (modality === 'audio') return 'audio';
  if (modality === 'video') return 'video';
  if (modality === 'image' || modality === 'texture' || modality === 'sprite' || modality === 'avatar' || modality === 'environment') return 'image';
  return null;
}

function assetCacheRoot(environment: Environment): string {
  return environment.SIGNAL_ASSET_CACHE_DIR || join(process.cwd(), '.signal-lab-cache', 'assets');
}

async function readMetadata(root: string, id: string): Promise<StoredAssetMetadata | null> {
  try {
    const parsed = JSON.parse(await readFile(join(root, `${id}.json`), 'utf8')) as StoredAssetMetadata;
    if (parsed.id !== id || !/^asset-[a-z0-9]+\.(?:jpg|png|glb|mp3|wav|mp4|webm)$/.test(parsed.fileName)) return null;
    await access(join(root, parsed.fileName));
    return parsed;
  } catch {
    return null;
  }
}

async function readValidatedStoredAsset(
  root: string,
  metadata: StoredAssetMetadata,
  context: ImageAssetFitnessContext = {},
): Promise<{ metadata: StoredAssetMetadata; bytes: Buffer } | null> {
  const bytes = await readFile(join(root, metadata.fileName)).catch(() => null);
  if (!bytes) return null;
  if (!/\.(?:jpg|png)$/.test(metadata.fileName)) return { metadata, bytes };
  try {
    const inspection = inspectionMatchesBytes(metadata.inspection, bytes)
      ? metadata.inspection!
      : await inspectImageAsset(bytes);
    assertImageAssetFitness(inspection, context);
    const format = imageFormat(inspection);
    const features: NonNullable<AssetCandidate['features']> = { alpha: inspection.alpha, depth: metadata.candidate.features?.depth || 'none' };
    const refreshed: StoredAssetMetadata = {
      ...metadata,
      contentType: format.contentType,
      candidate: {
        ...metadata.candidate,
        payloadBytes: bytes.byteLength,
        features,
      },
      inspection,
    };
    const needsRefresh = !inspectionMatchesBytes(metadata.inspection, bytes)
      || metadata.contentType !== format.contentType
      || metadata.candidate.payloadBytes !== bytes.byteLength
      || metadata.candidate.features?.alpha !== features.alpha;
    if (needsRefresh) {
      await writeAtomically(
        join(root, `${metadata.id}.json`),
        Buffer.from(JSON.stringify(refreshed), 'utf8'),
      );
    }
    return { metadata: refreshed, bytes };
  } catch {
    return null;
  }
}

function imageFitnessContext(
  role?: string,
  integration?: ImageAssetFitnessContext['integration'],
): ImageAssetFitnessContext {
  return {
    ...(role ? { role } : {}),
    ...(integration ? { integration } : {}),
  };
}

function imageFormat(inspection: ImageAssetInspection): {
  extension: 'jpg' | 'png';
  contentType: 'image/jpeg' | 'image/png';
} {
  return inspection.format === 'png'
    ? { extension: 'png', contentType: 'image/png' }
    : { extension: 'jpg', contentType: 'image/jpeg' };
}

async function callMiniMaxImage(options: { apiKey: string; model: string; prompt: string; seed: number; fetchImpl: typeof fetch; environment: Environment }): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    clampTimeoutToGenerationDeadline(options.environment, numberFrom(options.environment.MINIMAX_IMAGE_TIMEOUT_MS, 120_000)),
  );
  try {
    const baseUrl = (options.environment.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1').replace(/\/$/, '');
    const response = await options.fetchImpl(`${baseUrl}/image_generation`, {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: options.model, prompt: options.prompt, aspect_ratio: '16:9', response_format: 'base64', n: 1, seed: options.seed, prompt_optimizer: true })
    });
    const body = await response.json() as MiniMaxImageResponse;
    if (!response.ok || body.base_resp?.status_code !== 0) throw new Error(body.base_resp?.status_msg || `MiniMax 图片接口返回 HTTP ${response.status}`);
    const image = body.data?.image_base64?.[0];
    if (!image) throw new Error('MiniMax 图片接口没有返回 image_base64。');
    return image;
  } finally {
    clearTimeout(timer);
  }
}

async function writeAtomically(path: string, value: Buffer): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, value);
  await rename(temporary, path);
}

function numberFrom(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 5_000 ? Math.min(parsed, 300_000) : fallback;
}
