import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const IMAGE_ASSET_INSPECTOR_VERSION = 1 as const;
const MAX_IMAGE_PIXELS = 24_000_000;

export interface ImageAssetInspection {
  schemaVersion: 1;
  inspectorVersion: typeof IMAGE_ASSET_INSPECTOR_VERSION;
  sha256: string;
  format: 'png' | 'jpeg';
  width: number;
  height: number;
  pixels: number;
  alpha: 'none' | 'binary' | 'soft';
  transparentPixels: number;
  translucentPixels: number;
  visiblePixels: number;
  borderTransparentRatio: number;
}

export interface ImageAssetFitnessContext {
  integration?: 'alpha-subject' | 'full-bleed-environment' | 'seamless-field' | 'spatial-object' | 'native-media';
  role?: string;
}

export interface ImageAssetFitness {
  decision: 'pass' | 'reject';
  issues: string[];
}

/**
 * Establishes local, deterministic image facts only. It does not judge visual
 * taste and must never promote an asset's L2/L3/L4 quality level.
 */
export async function inspectImageAsset(bytes: Buffer): Promise<ImageAssetInspection> {
  if (!bytes.byteLength) throw new Error('图片文件为空。');
  try {
    const metadata = await sharp(bytes, {
      failOn: 'warning',
      limitInputPixels: MAX_IMAGE_PIXELS,
      sequentialRead: true,
    }).metadata();
    if (metadata.format !== 'png' && metadata.format !== 'jpeg') {
      throw new Error('只支持可完整解码的 PNG 或 JPEG 图片。');
    }

    const decoded = await sharp(bytes, {
      failOn: 'warning',
      limitInputPixels: MAX_IMAGE_PIXELS,
      sequentialRead: true,
    }).autoOrient().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = decoded.info;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || channels !== 4) {
      throw new Error('图片解码后没有得到有效的 RGBA 像素。');
    }
    const pixels = width * height;
    if (pixels > MAX_IMAGE_PIXELS || decoded.data.byteLength !== pixels * 4) {
      throw new Error(`图片像素超过 ${MAX_IMAGE_PIXELS.toLocaleString('en-US')} 上限，或解码负载不完整。`);
    }

    let transparentPixels = 0;
    let translucentPixels = 0;
    let visiblePixels = 0;
    let borderPixels = 0;
    let transparentBorderPixels = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = decoded.data[(y * width + x) * 4 + 3] ?? 255;
        if (alpha === 0) transparentPixels += 1;
        else {
          visiblePixels += 1;
          if (alpha < 255) translucentPixels += 1;
        }
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          borderPixels += 1;
          if (alpha === 0) transparentBorderPixels += 1;
        }
      }
    }

    return {
      schemaVersion: 1,
      inspectorVersion: IMAGE_ASSET_INSPECTOR_VERSION,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      format: metadata.format,
      width,
      height,
      pixels,
      alpha: translucentPixels > 0 ? 'soft' : transparentPixels > 0 ? 'binary' : 'none',
      transparentPixels,
      translucentPixels,
      visiblePixels,
      borderTransparentRatio: borderPixels ? transparentBorderPixels / borderPixels : 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('只支持') || message.startsWith('图片')) throw error;
    throw new Error(`图片无法完整解码：${message.replace(/\s+/g, ' ').slice(0, 240)}`);
  }
}

export function evaluateImageAssetFitness(
  inspection: ImageAssetInspection,
  context: ImageAssetFitnessContext = {},
): ImageAssetFitness {
  const issues: string[] = [];
  const { width, height, pixels } = inspection;
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  const integration = context.integration;

  if (longEdge < 256 || shortEdge < 128) {
    issues.push(`图片只有 ${width}×${height}，低于网页视觉素材的 256×128 基础检查阈值。`);
  }

  if (integration === 'alpha-subject') {
    if (width < 512 || height < 512) issues.push(`透明主体需要至少 512×512，当前为 ${width}×${height}。`);
    if (inspection.format !== 'png' || inspection.alpha === 'none') {
      issues.push('透明主体必须是具有真实透明像素的 PNG；JPEG、全不透明 RGBA 或烘焙棋盘格均不符合。');
    }
    if (inspection.transparentPixels / pixels < .01) issues.push('透明像素不足 1%，无法证明主体已从背景中分离。');
    if (inspection.visiblePixels / pixels < .05) issues.push('可见主体不足画布 5%，无法承担页面主体职责。');
    if (inspection.borderTransparentRatio < .25) issues.push('画布边缘透明安全区不足 25%，合成时容易出现明显矩形边界。');
  } else if (integration === 'full-bleed-environment') {
    const aspect = width / height;
    if (width < 1024 || height < 576) issues.push(`全幅环境图需要至少 1024×576，当前为 ${width}×${height}。`);
    if (aspect < 1.2 || aspect > 2.4) issues.push(`全幅环境图宽高比 ${aspect.toFixed(2)} 不在 1.20–2.40 的网页适配范围。`);
  } else if (integration === 'seamless-field' || integration === 'spatial-object') {
    if (width < 512 || height < 512) issues.push(`${integration === 'seamless-field' ? '连续场' : '空间物体'}需要至少 512×512，当前为 ${width}×${height}。`);
  } else if (integration === 'native-media') {
    if (longEdge < 640 || shortEdge < 360) issues.push(`原生媒体需要至少 640×360，当前为 ${width}×${height}。`);
  }

  return { decision: issues.length ? 'reject' : 'pass', issues };
}

export function assertImageAssetFitness(
  inspection: ImageAssetInspection,
  context: ImageAssetFitnessContext = {},
): void {
  const result = evaluateImageAssetFitness(inspection, context);
  if (result.decision === 'reject') {
    const role = context.role ? `${context.role}：` : '';
    throw new Error(`${role}${result.issues.join(' ')}`);
  }
}

export function inspectionMatchesBytes(inspection: ImageAssetInspection | undefined, bytes: Buffer): boolean {
  return Boolean(
    inspection
      && inspection.schemaVersion === 1
      && inspection.inspectorVersion === IMAGE_ASSET_INSPECTOR_VERSION
      && inspection.sha256 === createHash('sha256').update(bytes).digest('hex'),
  );
}
