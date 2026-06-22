import sharp from 'sharp';

async function toBuffer(input: string | Buffer): Promise<Buffer> {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

/** Clip an overlay to canvas bounds so Sharp composite never overflows. */
async function clipOverlayToCanvas(
  canvasW: number,
  canvasH: number,
  layer: sharp.OverlayOptions,
): Promise<sharp.OverlayOptions | null> {
  const left = layer.left ?? 0;
  const top = layer.top ?? 0;
  if (layer.input === undefined) return null;

  const buf = await toBuffer(layer.input as string | Buffer);
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (w === 0 || h === 0) return null;
  if (left >= canvasW || top >= canvasH || left + w <= 0 || top + h <= 0) return null;

  const fits =
    left >= 0 &&
    top >= 0 &&
    left + w <= canvasW &&
    top + h <= canvasH;

  if (fits) return layer;

  const srcLeft = Math.max(0, -left);
  const srcTop = Math.max(0, -top);
  const dstLeft = Math.max(0, left);
  const dstTop = Math.max(0, top);
  const extractW = Math.min(w - srcLeft, canvasW - dstLeft);
  const extractH = Math.min(h - srcTop, canvasH - dstTop);

  if (extractW <= 0 || extractH <= 0) return null;

  const cropped = await sharp(buf)
    .extract({ left: srcLeft, top: srcTop, width: extractW, height: extractH })
    .png()
    .toBuffer();

  return { ...layer, input: cropped, left: dstLeft, top: dstTop };
}

/** Composite layers onto a background, clipping any overflow (negative coords or off-canvas). */
export async function compositeOntoCanvas(
  canvasW: number,
  canvasH: number,
  background: Buffer,
  layers: sharp.OverlayOptions[],
): Promise<Buffer> {
  const clipped: sharp.OverlayOptions[] = [];

  for (const layer of layers) {
    const next = await clipOverlayToCanvas(canvasW, canvasH, layer);
    if (next) clipped.push(next);
  }

  if (clipped.length === 0) {
    return sharp(background).png({ quality: 100 }).toBuffer();
  }

  return sharp(background).composite(clipped).png({ quality: 100 }).toBuffer();
}
