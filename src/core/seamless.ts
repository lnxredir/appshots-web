import sharp from 'sharp';
import { getDevice } from '../devices.js';
import {
  frameOptionsSchema,
  type CustomFont,
  type FrameOptions,
  type SeamlessDevicePlacement,
  type SeamlessPanelText,
  type StickerPlacement,
} from '../types.js';
import { buildBackgroundSvg, buildPatternSvg } from './canvas-bg.js';
import { buildDeviceLayers } from './device-frame.js';
import { buildPanelTextSvg } from './panel-text.js';
import { buildStickerLayers } from './stickers.js';
import { compositeOntoCanvas } from './composite.js';

export interface SeamlessInput {
  device: string;
  panelCount: number;
  panels: SeamlessPanelText[];
  options?: Partial<FrameOptions>;
  devices: SeamlessDevicePlacement[];
  stickers?: StickerPlacement[];
  customFonts?: CustomFont[];
  orientation?: 'portrait' | 'landscape';
  /** Render at reduced resolution for faster UI preview (0–1, default 1) */
  previewScale?: number;
  /** When false, skip device frames (for client-side device overlays in the UI) */
  includeDevices?: boolean;
  /** When false, skip panel text (for client-side text overlays in the UI) */
  includeText?: boolean;
}

export interface SeamlessResult {
  wide: Buffer;
  panels: Buffer[];
}

export async function frameSeamless(params: SeamlessInput): Promise<SeamlessResult> {
  const {
    device,
    panelCount,
    panels,
    options,
    devices,
    stickers = [],
    customFonts = [],
    orientation = 'portrait',
    previewScale: previewScaleInput = 1,
    includeDevices = true,
    includeText = true,
  } = params;

  const previewScale = Math.min(1, Math.max(0.1, previewScaleInput));
  const opts = frameOptionsSchema.parse(options ?? {});
  const spec = getDevice(device);
  if (!spec) throw new Error(`Unknown device: ${device}`);

  const basePanelW = orientation === 'portrait' ? spec.width : spec.height;
  const basePanelH = orientation === 'portrait' ? spec.height : spec.width;
  const panelW = Math.max(1, Math.round(basePanelW * previewScale));
  const panelH = Math.max(1, Math.round(basePanelH * previewScale));
  const wideW = panelW * panelCount;
  const wideH = panelH;
  const pngOpts = previewScale < 1
    ? { compressionLevel: 2 as const }
    : { quality: 100 as const };

  const bgSvg = buildBackgroundSvg(wideW, wideH, opts.background);
  const patternSvg = opts.pattern
    ? buildPatternSvg(wideW, wideH, opts.pattern, opts.patternColor, opts.patternOpacity)
    : null;

  const layers: sharp.OverlayOptions[] = [];

  if (patternSvg) {
    layers.push({ input: Buffer.from(patternSvg), top: 0, left: 0 });
  }

  layers.push(...await buildStickerLayers(stickers, wideW, wideH, 'background', true));

  if (includeDevices) {
    for (const placement of devices) {
      const phoneX = Math.round(wideW * placement.x);
      const phoneY = Math.round(panelH * placement.y);
      const deviceLayers = await buildDeviceLayers({
        input: placement.image,
        spec,
        opts,
        panelW,
        canvasW: wideW,
        canvasH: wideH,
        phoneX,
        phoneY,
        widthScale: placement.width,
        orientation,
        rotation: Number(placement.rotation) || 0,
      });
      layers.push(...deviceLayers);
    }
  }

  layers.push(...await buildStickerLayers(stickers, wideW, wideH, 'behind-text', true));

  for (let i = 0; i < panelCount; i++) {
    const panel = panels[i] ?? {};
    const hasText = !!(panel.title || panel.subtitle);
    if (!hasText || !includeText) continue;

    const panelOpts = frameOptionsSchema.parse({ ...opts, ...(panel.style ?? {}) });
    const textSvg = await buildPanelTextSvg(
      panelW,
      panelH,
      panel.title,
      panel.subtitle,
      panelOpts,
      customFonts,
    );
    layers.push({ input: Buffer.from(textSvg), top: 0, left: i * panelW });
  }

  layers.push(...await buildStickerLayers(stickers, wideW, wideH, 'foreground', true));

  const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  const wide = await compositeOntoCanvas(wideW, wideH, bg, layers);

  const panelBuffers: Buffer[] = [];
  for (let i = 0; i < panelCount; i++) {
    const slice = await sharp(wide)
      .extract({ left: i * panelW, top: 0, width: panelW, height: panelH })
      .png(pngOpts)
      .toBuffer();
    panelBuffers.push(slice);
  }

  const wideOut = previewScale < 1
    ? await sharp(wide).png(pngOpts).toBuffer()
    : wide;

  return { wide: wideOut, panels: panelBuffers };
}
