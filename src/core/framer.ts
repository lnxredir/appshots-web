import sharp from 'sharp';
import { getDevice } from '../devices.js';
import { frameOptionsSchema, type FrameOptions, type DeviceSpec, type StickerPlacement, type CustomFont } from '../types.js';
import {
  buildFontFaces,
  buildTextAttrs,
  buildTextFilters,
  formatTextContent,
} from './text-styles.js';
import { buildStickerLayers } from './stickers.js';
import { compositeOntoCanvas } from './composite.js';
import { buildDeviceLayers } from './device-frame.js';
import { buildPanelTextSvg } from './panel-text.js';

interface FrameInput {
  /** Path or buffer of the raw screenshot */
  input: string | Buffer;
  /** Device slug (e.g., "iphone-6.9") */
  device: string;
  /** Frame styling options */
  options?: Partial<FrameOptions>;
  /** Title text overlay */
  title?: string;
  /** Subtitle text overlay */
  subtitle?: string;
  /** Orientation: portrait or landscape */
  orientation?: 'portrait' | 'landscape';
  /** Decorative sticker overlays */
  stickers?: StickerPlacement[];
  /** User-uploaded font files */
  customFonts?: CustomFont[];
  /** When false, skip device frame rendering (for client-side live preview) */
  includeDevice?: boolean;
  /** When false, skip text overlay rendering (for client-side live preview) */
  includeText?: boolean;
}

// ─── Device frame configuration ────────────────────────────

interface DeviceFrameConfig {
  bezelWidth: number; // ratio of phone width
  bodyRadius: number; // ratio of phone width
  screenRadius: number; // ratio of phone width
  dynamicIsland: boolean;
  homeButton: boolean;
  notchWidth: number; // ratio of phone width
  notchHeight: number; // ratio of phone width
  homeBarWidth: number; // ratio of phone width
  homeBarHeight: number; // ratio of phone width
  phoneScale: number; // phone width as ratio of canvas width
}

function getFrameConfig(spec: DeviceSpec): DeviceFrameConfig {
  if (spec.platform === 'ios' && spec.category === 'phone') {
    const isOlder = spec.slug === 'iphone-5.5' || spec.slug === 'iphone-4.7';
    if (isOlder) {
      return {
        bezelWidth: 0.05,
        bodyRadius: 0.1,
        screenRadius: 0.03,
        dynamicIsland: false,
        homeButton: true,
        notchWidth: 0,
        notchHeight: 0,
        homeBarWidth: 0,
        homeBarHeight: 0,
        phoneScale: 0.775,
      };
    }
    // Modern iPhones — exact LeanDine production ratios
    return {
      bezelWidth: 0.04,
      bodyRadius: 0.176,
      screenRadius: 0.136,
      dynamicIsland: true,
      homeButton: false,
      notchWidth: 0.36,
      notchHeight: 0.112,
      homeBarWidth: 0.4,
      homeBarHeight: 0.02,
      phoneScale: 0.775,
    };
  }

  if (spec.category === 'tablet') {
    return {
      bezelWidth: 0.025,
      bodyRadius: 0.06,
      screenRadius: 0.045,
      dynamicIsland: false,
      homeButton: false,
      notchWidth: 0,
      notchHeight: 0,
      homeBarWidth: 0.25,
      homeBarHeight: 0.012,
      phoneScale: 0.88,
    };
  }

  // Android phones
  if (spec.category === 'phone') {
    return {
      bezelWidth: 0.035,
      bodyRadius: 0.14,
      screenRadius: 0.11,
      dynamicIsland: false,
      homeButton: false,
      notchWidth: 0,
      notchHeight: 0,
      homeBarWidth: 0.35,
      homeBarHeight: 0.018,
      phoneScale: 0.775,
    };
  }

  // Desktop/other
  return {
    bezelWidth: 0.03,
    bodyRadius: 0.05,
    screenRadius: 0.04,
    dynamicIsland: false,
    homeButton: false,
    notchWidth: 0,
    notchHeight: 0,
    homeBarWidth: 0,
    homeBarHeight: 0,
    phoneScale: 0.85,
  };
}

// ─── Main export ───────────────────────────────────────────

export async function frameScreenshot(params: FrameInput): Promise<Buffer> {
  const {
    input,
    device,
    title,
    subtitle,
    orientation = 'portrait',
    stickers = [],
    customFonts = [],
    includeDevice = true,
    includeText = true,
  } = params;
  const opts = frameOptionsSchema.parse(params.options ?? {});

  const spec = getDevice(device);
  if (!spec) throw new Error(`Unknown device: ${device}`);

  const canvasW = orientation === 'portrait' ? spec.width : spec.height;
  const canvasH = orientation === 'portrait' ? spec.height : spec.width;

  const hasOverlay = !!(title || subtitle);
  const hasStickers = stickers.length > 0;
  const isPlainResize =
    !hasOverlay &&
    !hasStickers &&
    opts.background === '#000000' &&
    !opts.shadow &&
    !opts.deviceFrame &&
    !opts.pattern;

  if (isPlainResize) {
    return sharp(input)
      .resize(canvasW, canvasH, { fit: 'cover', position: 'center' })
      .png({ quality: 100 })
      .toBuffer();
  }

  const showFrame =
    opts.deviceFrame && (spec.category === 'phone' || spec.category === 'tablet');

  if (showFrame) {
    return frameWithDevice(
      input, spec, opts, canvasW, canvasH, title, subtitle, hasOverlay && includeText, orientation, stickers, customFonts,
      includeDevice,
    );
  }

  // Non-device-frame path — existing layout
  const padX = Math.round(canvasW * opts.padding);
  const padY = Math.round(canvasH * opts.padding * 0.6);
  const titleFontSize = Math.round(canvasW * opts.titleSize);
  const subtitleFontSize = Math.round(canvasW * opts.subtitleSize);
  const titleH = title ? Math.round(titleFontSize * 2) : 0;
  const subtitleH = subtitle ? Math.round(subtitleFontSize * 2.4) : 0;
  const topOffset = padY + titleH + subtitleH;
  const areaW = canvasW - padX * 2;
  const areaH = canvasH - topOffset - padY;

  return frameWithoutDevice(
    input, opts, canvasW, canvasH, areaW, areaH, padX, topOffset, padY,
    title, subtitle, titleH, subtitleH, titleFontSize, subtitleFontSize, hasOverlay && includeText, stickers, customFonts,
  );
}

// ─── Frame WITH device bezel (LeanDine-style) ──────────────

async function frameWithDevice(
  input: string | Buffer,
  spec: DeviceSpec,
  opts: FrameOptions,
  canvasW: number,
  canvasH: number,
  title: string | undefined,
  subtitle: string | undefined,
  hasOverlay: boolean,
  orientation: string,
  stickers: StickerPlacement[],
  customFonts: CustomFont[],
  includeDevice = true,
): Promise<Buffer> {
  const fc = getFrameConfig(spec);
  const widthScale = opts.screenshotWidth ?? 1;
  const phoneW = Math.round(canvasW * fc.phoneScale * widthScale);
  const bezel = Math.round(phoneW * fc.bezelWidth);
  const screenW = phoneW - bezel * 2;
  const nativeW = orientation === 'portrait' ? spec.width : spec.height;
  const nativeH = orientation === 'portrait' ? spec.height : spec.width;
  const screenH = Math.round(screenW * (nativeH / nativeW));
  const phoneH = screenH + bezel * 2;

  let phoneX: number;
  let phoneY: number;
  if (opts.screenshotX !== undefined && opts.screenshotY !== undefined) {
    phoneX = Math.round(canvasW * opts.screenshotX);
    phoneY = Math.round(canvasH * opts.screenshotY);
  } else if (opts.textPosition === 'top') {
    phoneX = Math.round((canvasW - phoneW) / 2);
    phoneY = canvasH - phoneH + Math.round(phoneH * 0.056);
  } else {
    phoneX = Math.round((canvasW - phoneW) / 2);
    phoneY = -Math.round(phoneH * 0.074);
  }

  const rotation = Number(opts.screenshotRotation) || 0;

  const bgSvg = buildBackgroundSvg(canvasW, canvasH, opts.background);
  const patternSvg = opts.pattern
    ? buildPatternSvg(canvasW, canvasH, opts.pattern, opts.patternColor, opts.patternOpacity)
    : null;

  const textSvg = hasOverlay
    ? await buildPanelTextSvg(canvasW, canvasH, title, subtitle, opts, customFonts)
    : null;

  const layers: sharp.OverlayOptions[] = [];

  if (patternSvg) {
    layers.push({ input: Buffer.from(patternSvg), top: 0, left: 0 });
  }

  layers.push(...await buildStickerLayers(stickers, canvasW, canvasH, 'background'));

  if (includeDevice) {
    const deviceLayers = await buildDeviceLayers({
      input: input as Buffer,
      spec,
      opts,
      panelW: canvasW,
      canvasW,
      canvasH,
      phoneX,
      phoneY,
      widthScale,
      orientation: orientation as 'portrait' | 'landscape',
      rotation,
    });
    layers.push(...deviceLayers);
  }

  layers.push(...await buildStickerLayers(stickers, canvasW, canvasH, 'behind-text'));

  if (textSvg) {
    layers.push({ input: Buffer.from(textSvg), top: 0, left: 0 });
  }

  layers.push(...await buildStickerLayers(stickers, canvasW, canvasH, 'foreground'));

  const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  return compositeOntoCanvas(canvasW, canvasH, bg, layers);
}

// ─── Frame WITHOUT device bezel ────────────────────────────

async function frameWithoutDevice(
  input: string | Buffer,
  opts: FrameOptions,
  canvasW: number,
  canvasH: number,
  areaW: number,
  areaH: number,
  padX: number,
  topOffset: number,
  padY: number,
  title: string | undefined,
  subtitle: string | undefined,
  titleH: number,
  subtitleH: number,
  titleFontSize: number,
  subtitleFontSize: number,
  hasOverlay: boolean,
  stickers: StickerPlacement[],
  customFonts: CustomFont[],
): Promise<Buffer> {
  const cornerR = Math.round(areaW * opts.borderRadius);

  const resized = await sharp(input)
    .resize(areaW, areaH, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();

  const roundedMask = Buffer.from(
    `<svg width="${areaW}" height="${areaH}">
      <rect width="${areaW}" height="${areaH}" rx="${cornerR}" ry="${cornerR}" fill="white"/>
    </svg>`
  );
  const rounded = await sharp(resized)
    .ensureAlpha()
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const bgSvg = buildBackgroundSvg(canvasW, canvasH, opts.background);
  const patternSvg = opts.pattern
    ? buildPatternSvg(canvasW, canvasH, opts.pattern, opts.patternColor, opts.patternOpacity)
    : null;
  const textSvg = hasOverlay
    ? await buildTextSvg(canvasW, padY, titleH, subtitleH, titleFontSize, subtitleFontSize, title, subtitle, opts, customFonts)
    : null;

  let shadowBuf: Buffer | null = null;
  if (opts.shadow) {
    const sp = 40;
    const shadowSvg = `<svg width="${areaW + sp * 2}" height="${areaH + sp * 2}">
      <rect x="${sp}" y="${sp}" width="${areaW}" height="${areaH}"
        rx="${cornerR}" ry="${cornerR}" fill="rgba(0,0,0,0.35)"/>
    </svg>`;
    shadowBuf = await sharp(Buffer.from(shadowSvg)).blur(20).png().toBuffer();
  }

  const layers: sharp.OverlayOptions[] = [];
  if (patternSvg) {
    layers.push({ input: Buffer.from(patternSvg), top: 0, left: 0 });
  }

  layers.push(...await buildStickerLayers(stickers, canvasW, canvasH, 'background'));

  if (shadowBuf) {
    layers.push({ input: shadowBuf, top: topOffset - 40 + 8, left: padX - 40 });
  }
  layers.push({ input: rounded, top: topOffset, left: padX });
  layers.push(...await buildStickerLayers(stickers, canvasW, canvasH, 'behind-text'));
  if (textSvg) {
    layers.push({ input: Buffer.from(textSvg), top: 0, left: 0 });
  }

  layers.push(...await buildStickerLayers(stickers, canvasW, canvasH, 'foreground'));

  const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  return compositeOntoCanvas(canvasW, canvasH, bg, layers);
}

// ─── Background SVG ────────────────────────────────────────

function buildBackgroundSvg(w: number, h: number, background: string): string {
  const gradientMatch = background.match(
    /linear-gradient\(\s*(\d+)deg\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/
  );

  if (gradientMatch) {
    const angle = parseInt(gradientMatch[1], 10);
    const color1 = gradientMatch[2].trim();
    const color2 = gradientMatch[3].trim();
    const { x1, y1, x2, y2 } = angleToCoords(angle);

    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
          <stop offset="0%" stop-color="${color1}"/>
          <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
    </svg>`;
  }

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${background}"/>
  </svg>`;
}

// ─── Pattern SVG ───────────────────────────────────────────

const PATTERNS: Record<string, (size: number, color: string) => string> = {
  dots: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.08}" fill="${c}"/>`,

  grid: (s, c) =>
    `<line x1="0" y1="${s}" x2="${s}" y2="${s}" stroke="${c}" stroke-width="1"/>
     <line x1="${s}" y1="0" x2="${s}" y2="${s}" stroke="${c}" stroke-width="1"/>`,

  diagonal: (s, c) =>
    `<line x1="0" y1="${s}" x2="${s}" y2="0" stroke="${c}" stroke-width="1.5"/>`,

  'cross-dots': (s, c) =>
    `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.06}" fill="${c}"/>
     <line x1="${s * 0.3}" y1="${s / 2}" x2="${s * 0.7}" y2="${s / 2}" stroke="${c}" stroke-width="1"/>
     <line x1="${s / 2}" y1="${s * 0.3}" x2="${s / 2}" y2="${s * 0.7}" stroke="${c}" stroke-width="1"/>`,

  waves: (s, c) => {
    const h = s / 2;
    return `<path d="M0 ${h} Q${s / 4} ${h - s * 0.3} ${s / 2} ${h} T${s} ${h}"
      fill="none" stroke="${c}" stroke-width="1.5"/>`;
  },

  diamonds: (s, c) => {
    const m = s / 2;
    return `<polygon points="${m},${s * 0.1} ${s * 0.9},${m} ${m},${s * 0.9} ${s * 0.1},${m}" fill="none" stroke="${c}" stroke-width="1"/>`;
  },
};

function buildPatternSvg(
  w: number, h: number, pattern: string, color: string, opacity: number,
): string | null {
  const builder = PATTERNS[pattern];
  if (!builder) return null;

  const tileSize = Math.round(Math.min(w, h) * 0.025);
  const tile = builder(tileSize, color);

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="pat" width="${tileSize}" height="${tileSize}" patternUnits="userSpaceOnUse">
        ${tile}
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#pat)" opacity="${opacity}"/>
  </svg>`;
}

// ─── Text SVG (non-device mode) ────────────────────────────

async function buildTextSvg(
  canvasW: number,
  padY: number,
  titleH: number,
  subtitleH: number,
  titleFontSize: number,
  subtitleFontSize: number,
  title: string | undefined,
  subtitle: string | undefined,
  opts: FrameOptions,
  customFonts: CustomFont[],
): Promise<string> {
  const cx = Math.round(canvasW / 2);
  const titleAttrs = buildTextAttrs('title', opts, titleFontSize, customFonts);
  const subtitleAttrs = buildTextAttrs('subtitle', opts, subtitleFontSize, customFonts);

  const fontFaces = await buildFontFaces([opts.titleFont, opts.subtitleFont], customFonts);
  const filters = buildTextFilters(opts);

  let textElements = '';

  if (title) {
    const titleY = padY + Math.round(titleFontSize * 1.25);
    const text = formatTextContent(title, opts.titleUppercase);
    textElements += `<text x="${cx}" y="${titleY}" ${titleAttrs}>${escapeXml(text)}</text>`;
  }

  if (subtitle) {
    const subtitleY = padY + titleH + Math.round(subtitleFontSize * 1.4);
    const text = formatTextContent(subtitle, opts.subtitleUppercase);
    textElements += `<text x="${cx}" y="${subtitleY}" ${subtitleAttrs}>${escapeXml(text)}</text>`;
  }

  const styleBlock = fontFaces ? `<style>${fontFaces}</style>` : '';

  return `<svg width="${canvasW}" height="${padY + titleH + subtitleH}" xmlns="http://www.w3.org/2000/svg">
    <defs>${styleBlock}${filters}</defs>
    ${textElements}
  </svg>`;
}

// ─── Helpers ───────────────────────────────────────────────

function angleToCoords(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(rad) * 50);
  const y1 = Math.round(50 - Math.sin(rad) * 50);
  const x2 = Math.round(50 + Math.cos(rad) * 50);
  const y2 = Math.round(50 + Math.sin(rad) * 50);
  return { x1, y1, x2, y2 };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
