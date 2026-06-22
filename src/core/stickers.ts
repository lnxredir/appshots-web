import sharp from 'sharp';
import type { StickerPlacement } from '../types.js';

export async function buildStickerLayers(
  stickers: StickerPlacement[],
  canvasW: number,
  canvasH: number,
  layer: StickerPlacement['layer'],
  allowOverflow = false,
): Promise<sharp.OverlayOptions[]> {
  const layers: sharp.OverlayOptions[] = [];

  for (const sticker of stickers.filter((s) => s.layer === layer)) {
    const meta = await sharp(sticker.image).metadata();
    const targetW = Math.max(1, Math.round(canvasW * sticker.width));
    const aspect = (meta.height ?? 1) / (meta.width ?? 1);
    const targetH = Math.max(1, Math.round(targetW * aspect));

    const resized = await sharp(sticker.image).resize(targetW, targetH).png().toBuffer();

    const left = Math.round(canvasW * sticker.x);
    const top = Math.round(canvasH * sticker.y);

    layers.push({
      input: resized,
      left: allowOverflow ? left : Math.max(0, left),
      top: allowOverflow ? top : Math.max(0, top),
    });
  }

  return layers;
}
