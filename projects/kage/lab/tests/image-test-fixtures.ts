import sharp from 'sharp';

export async function transparentSubjectPng(
  width = 512,
  height = 512,
  alpha: 128 | 255 = 255,
): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 4, 0);
  const xStart = Math.floor(width * .2);
  const xEnd = Math.ceil(width * .8);
  const yStart = Math.floor(height * .2);
  const yEnd = Math.ceil(height * .8);
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = 88;
      pixels[offset + 1] = 140;
      pixels[offset + 2] = 196;
      pixels[offset + 3] = alpha;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

export async function opaquePng(width = 1024, height = 576): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 94, g: 126, b: 152 } },
  }).png().toBuffer();
}

export async function opaqueJpeg(width = 1024, height = 576): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 94, g: 126, b: 152 } },
  }).jpeg({ quality: 82 }).toBuffer();
}
