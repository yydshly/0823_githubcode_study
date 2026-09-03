import type { TuningState } from './director';

export type SoundboardScene = {
  resize: (width: number, height: number, dpr: number) => void;
  render: (state: TuningState, progress: number) => void;
  dispose: () => void;
};

type Rect = { x: number; y: number; width: number; height: number };

const FRAME_COUNT = 3;

export function createSoundboardScene(canvas: HTMLCanvasElement): SoundboardScene {
  const ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas');
  const layerCtx = layer.getContext('2d');
  const photo = new Image();
  let ready = false;
  let width = 1;
  let height = 1;
  let dpr = 1;
  photo.onload = () => { ready = true; };
  photo.src = '/creative-assets/r92-luthier-soundboard-state-atlas-v1.png';

  function resize(nextWidth: number, nextHeight: number, nextDpr: number): void {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width || nextWidth);
    height = Math.max(1, bounds.height || nextHeight);
    dpr = Math.max(1, nextDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    layer.width = canvas.width;
    layer.height = canvas.height;
  }

  function render(state: TuningState, _progress: number): void {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    paintWarmBench(ctx, width, height);
    if (!ready || !layerCtx) return;

    const target = soundboardTarget(width, height, photo.width / FRAME_COUNT / photo.height);
    const atlasPosition = clamp(state.atlasPosition, 0, FRAME_COUNT - 1);
    const firstFrame = Math.floor(atlasPosition);
    const secondFrame = Math.min(FRAME_COUNT - 1, firstFrame + 1);
    const frameMix = smooth01(atlasPosition - firstFrame);
    const warpPx = state.deflection * (width < 700 ? 26 : 54);

    paintAtlasFrame(firstFrame, target, state, warpPx);
    drawLayer(1 - frameMix);
    if (secondFrame !== firstFrame && frameMix > 0.001) {
      paintAtlasFrame(secondFrame, target, state, warpPx);
      drawLayer(frameMix);
    }
    paintMeasurementEvidence(ctx, target, state);
  }

  function paintAtlasFrame(frameIndex: number, target: Rect, state: TuningState, warpPx: number): void {
    if (!layerCtx) return;
    layerCtx.setTransform(1, 0, 0, 1, 0, 0);
    layerCtx.clearRect(0, 0, layer.width, layer.height);
    layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rawFrameWidth = photo.width / FRAME_COUNT;
    const seamInset = Math.max(2, rawFrameWidth * 0.006);
    const sourceX = frameIndex * rawFrameWidth + seamInset;
    const sourceWidth = rawFrameWidth - seamInset * 2;
    layerCtx.drawImage(
      photo,
      sourceX,
      0,
      sourceWidth,
      photo.height,
      target.x,
      target.y,
      target.width,
      target.height,
    );

    // Bend only the plate ROI. The surrounding ruler, tools and bench remain
    // fixed, so the change reads as material response rather than camera drift.
    const boardPath = createBoardPath(target);
    layerCtx.save();
    layerCtx.clip(boardPath);
    const strips = width < 700 ? 20 : 26;
    const sourceStripHeight = photo.height / strips;
    const targetStripHeight = target.height / strips;
    for (let index = 0; index < strips; index += 1) {
      const y = (index + 0.5) / strips;
      const bellyProfile = Math.sin(Math.PI * y) ** 2;
      const extraWidth = warpPx * bellyProfile;
      const lateralShift = Math.sin(y * Math.PI * 2 + state.phase) * warpPx * 0.10;
      layerCtx.drawImage(
        photo,
        sourceX,
        index * sourceStripHeight,
        sourceWidth,
        sourceStripHeight + 1,
        target.x - extraWidth * 0.5 + lateralShift,
        target.y + index * targetStripHeight,
        target.width + extraWidth,
        targetStripHeight + 1,
      );
    }
    layerCtx.restore();
    featherLayer(layerCtx, target);
  }

  function drawLayer(alpha: number): void {
    if (!ctx || alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(layer, 0, 0, layer.width, layer.height, 0, 0, width, height);
    ctx.restore();
  }

  return {
    resize,
    render,
    dispose: () => {
      ready = false;
      photo.onload = null;
      photo.src = '';
      layer.width = 1;
      layer.height = 1;
    },
  };
}

function paintWarmBench(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, '#f4ecde');
  base.addColorStop(0.48, '#dcc9aa');
  base.addColorStop(1, '#b99a72');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  const light = ctx.createRadialGradient(width * 0.62, height * 0.24, 0, width * 0.62, height * 0.24, Math.max(width, height) * 0.8);
  light.addColorStop(0, 'rgba(255,252,244,.36)');
  light.addColorStop(1, 'rgba(91,65,37,.13)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
}

function soundboardTarget(width: number, height: number, aspect: number): Rect {
  const targetHeight = height * (width < 700 ? 0.90 : 1.08);
  const targetWidth = targetHeight * aspect;
  const centerX = width * (width < 700 ? 0.52 : 0.60);
  return {
    x: centerX - targetWidth * 0.5,
    y: (height - targetHeight) * 0.5,
    width: targetWidth,
    height: targetHeight,
  };
}

function createBoardPath(rect: Rect): Path2D {
  const x = (value: number): number => rect.x + rect.width * value;
  const y = (value: number): number => rect.y + rect.height * value;
  const path = new Path2D();
  path.moveTo(x(0.50), y(0.115));
  path.bezierCurveTo(x(0.72), y(0.10), x(0.91), y(0.16), x(0.91), y(0.28));
  path.bezierCurveTo(x(0.91), y(0.36), x(0.76), y(0.37), x(0.78), y(0.47));
  path.bezierCurveTo(x(0.80), y(0.55), x(0.97), y(0.57), x(0.96), y(0.73));
  path.bezierCurveTo(x(0.96), y(0.89), x(0.78), y(0.95), x(0.50), y(0.95));
  path.bezierCurveTo(x(0.22), y(0.95), x(0.04), y(0.89), x(0.04), y(0.73));
  path.bezierCurveTo(x(0.03), y(0.57), x(0.20), y(0.55), x(0.22), y(0.47));
  path.bezierCurveTo(x(0.24), y(0.37), x(0.09), y(0.36), x(0.09), y(0.28));
  path.bezierCurveTo(x(0.09), y(0.16), x(0.28), y(0.10), x(0.50), y(0.115));
  path.closePath();
  return path;
}

function paintMeasurementEvidence(ctx: CanvasRenderingContext2D, rect: Rect, state: TuningState): void {
  const boardPath = createBoardPath(rect);
  ctx.save();
  ctx.clip(boardPath);
  ctx.globalCompositeOperation = 'multiply';
  const response = clamp((state.bellyIntensity - 0.08) / 0.92, 0, 1);
  // A restrained two-lobe displacement field gives the simulated evidence a
  // readable physical footprint. Its centers migrate as the plate thins, so
  // consecutive tuning states differ across the material rather than only in
  // a few decorative pixels.
  const upperX = rect.x + rect.width * (0.62 - response * 0.16);
  const upperY = rect.y + rect.height * (0.34 + response * 0.06);
  const upperRadius = rect.width * (0.32 + response * 0.08);
  const upper = ctx.createRadialGradient(upperX, upperY, 0, upperX, upperY, upperRadius);
  upper.addColorStop(0, `rgba(88,113,96,${(0.02 + response * 0.46).toFixed(3)})`);
  upper.addColorStop(0.64, `rgba(88,113,96,${(0.01 + response * 0.18).toFixed(3)})`);
  upper.addColorStop(1, 'rgba(88,113,96,0)');
  ctx.fillStyle = upper;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  const lowerX = rect.x + rect.width * (0.40 + response * 0.20);
  const lowerY = rect.y + rect.height * (0.72 - response * 0.04);
  const lowerRadius = rect.width * (0.34 + response * 0.10);
  const lower = ctx.createRadialGradient(lowerX, lowerY, 0, lowerX, lowerY, lowerRadius);
  lower.addColorStop(0, `rgba(177,101,42,${(0.03 + response * 0.56).toFixed(3)})`);
  lower.addColorStop(0.62, `rgba(177,101,42,${(0.01 + response * 0.22).toFixed(3)})`);
  lower.addColorStop(1, 'rgba(177,101,42,0)');
  ctx.fillStyle = lower;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  const finalReveal = smooth01(clamp((response - 0.55) / 0.45, 0, 1));
  if (finalReveal > 0.001) {
    const resolved = ctx.createLinearGradient(
      rect.x + rect.width * 0.12,
      rect.y + rect.height * 0.20,
      rect.x + rect.width * 0.88,
      rect.y + rect.height * 0.86,
    );
    resolved.addColorStop(0, `rgba(75,103,91,${(finalReveal * 0.36).toFixed(3)})`);
    resolved.addColorStop(0.46, `rgba(158,118,65,${(finalReveal * 0.14).toFixed(3)})`);
    resolved.addColorStop(1, `rgba(178,91,36,${(finalReveal * 0.48).toFixed(3)})`);
    ctx.fillStyle = resolved;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  const centerX = rect.x + rect.width * 0.51;
  const centerY = rect.y + rect.height * 0.67;
  const radius = rect.width * 0.46;
  const responsive = state.bellyIntensity;
  const field = ctx.createRadialGradient(centerX, centerY, radius * 0.04, centerX, centerY, radius);
  field.addColorStop(0, `rgba(181,105,45,${(0.06 + responsive * 0.34).toFixed(3)})`);
  field.addColorStop(0.56, `rgba(161,121,64,${(0.03 + responsive * 0.20).toFixed(3)})`);
  field.addColorStop(1, 'rgba(93,112,91,0)');
  ctx.fillStyle = field;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  ctx.lineWidth = widthAwareLine(rect.width);
  ctx.strokeStyle = `rgba(73,65,45,${(0.08 + state.nodeIntensity * 0.52).toFixed(3)})`;
  const contourLevels = [0.30, 0.47, 0.66, 0.82];
  for (let index = 0; index < contourLevels.length; index += 1) {
    const level = contourLevels[index];
    const bow = (state.localDeflectionMm - 0.30) * rect.width * (0.10 + index * 0.015);
    const contourY = rect.y + rect.height * level;
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.width * 0.15, contourY);
    ctx.bezierCurveTo(
      rect.x + rect.width * 0.35,
      contourY - bow,
      rect.x + rect.width * 0.65,
      contourY + bow,
      rect.x + rect.width * 0.85,
      contourY,
    );
    ctx.stroke();
  }

  const points = [
    [0.35, 0.36],
    [0.66, 0.39],
    [0.40, 0.68],
    [0.62, 0.73],
  ] as const;
  for (const [px, py] of points) {
    const pointX = rect.x + rect.width * px;
    const pointY = rect.y + rect.height * py;
    const pointRadius = 2.4 + state.nodeIntensity * 2.8;
    ctx.beginPath();
    ctx.arc(pointX, pointY, pointRadius * 2.05, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(80,67,44,${(0.12 + state.nodeIntensity * 0.24).toFixed(3)})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pointX, pointY, pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(116,74,36,${(0.20 + state.nodeIntensity * 0.50).toFixed(3)})`;
    ctx.fill();
  }
  ctx.restore();
}

function featherLayer(context: CanvasRenderingContext2D, rect: Rect): void {
  context.save();
  context.globalCompositeOperation = 'destination-in';
  const horizontal = context.createLinearGradient(rect.x, 0, rect.x + rect.width, 0);
  horizontal.addColorStop(0, 'rgba(255,255,255,0)');
  horizontal.addColorStop(0.055, 'rgba(255,255,255,1)');
  horizontal.addColorStop(0.945, 'rgba(255,255,255,1)');
  horizontal.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = horizontal;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  const vertical = context.createLinearGradient(0, rect.y, 0, rect.y + rect.height);
  vertical.addColorStop(0, 'rgba(255,255,255,0)');
  vertical.addColorStop(0.045, 'rgba(255,255,255,1)');
  vertical.addColorStop(0.955, 'rgba(255,255,255,1)');
  vertical.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = vertical;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function widthAwareLine(subjectWidth: number): number {
  return Math.max(0.8, Math.min(1.35, subjectWidth / 520));
}

function smooth01(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
