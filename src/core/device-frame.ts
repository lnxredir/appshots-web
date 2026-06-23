import sharp from 'sharp';
import type { DeviceSpec, FrameOptions } from '../types.js';
import type { DeviceFrameConfig } from './device-frame-config.js';
import { getFrameConfig, resolveFrameColor } from './device-frame-config.js';

export interface DevicePlacementParams {
  input: Buffer;
  spec: DeviceSpec;
  opts: FrameOptions;
  panelW: number;
  canvasW: number;
  canvasH: number;
  phoneX: number;
  phoneY: number;
  widthScale: number;
  orientation: 'portrait' | 'landscape';
  rotation?: number;
}

function buildPhoneOverlaysSvg(
  canvasW: number,
  canvasH: number,
  phoneX: number,
  phoneY: number,
  phoneW: number,
  phoneH: number,
  bezel: number,
  fc: DeviceFrameConfig,
): string {
  const screenX = phoneX + bezel;
  const screenY = phoneY + bezel;
  const screenH = phoneH - bezel * 2;

  let notchSvg = '';
  if (fc.dynamicIsland && fc.notchWidth > 0) {
    const nw = Math.round(phoneW * fc.notchWidth);
    const nh = Math.round(phoneW * fc.notchHeight);
    const nx = phoneX + Math.round((phoneW - nw) / 2);
    const ny = screenY + Math.round(bezel * 0.8);
    const nr = Math.round(nh / 2);
    notchSvg = `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}"
      rx="${nr}" ry="${nr}" fill="#000000"/>`;
  }

  let homeBarSvg = '';
  if (fc.homeBarWidth > 0 && !fc.homeButton) {
    const bw = Math.round(phoneW * fc.homeBarWidth);
    const bh = Math.round(phoneW * fc.homeBarHeight);
    const bx = phoneX + Math.round((phoneW - bw) / 2);
    const by = screenY + screenH - Math.round(bezel * 0.8) - bh;
    const br = Math.round(bh / 2);
    homeBarSvg = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}"
      rx="${br}" ry="${br}" fill="rgba(255,255,255,0.25)"/>`;
  }

  let homeButtonSvg = '';
  if (fc.homeButton) {
    const btnR = Math.round(phoneW * 0.05);
    const btnCx = phoneX + Math.round(phoneW / 2);
    const btnCy = phoneY + phoneH - Math.round(bezel * 2.2);
    homeButtonSvg = `<circle cx="${btnCx}" cy="${btnCy}" r="${btnR}"
      fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>`;
  }

  return `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
    ${notchSvg}${homeBarSvg}${homeButtonSvg}
  </svg>`;
}

async function buildPhoneShadow(
  canvasW: number,
  canvasH: number,
  phoneX: number,
  phoneY: number,
  phoneW: number,
  phoneH: number,
  bodyRadius: number,
): Promise<Buffer> {
  const sigma = Math.max(1, Math.round(phoneW * 0.08));
  const offsetY = Math.round(phoneH * 0.05);
  const pad = sigma * 3;

  const svgW = canvasW + pad * 2;
  const svgH = canvasH + pad * 2;
  const rectX = phoneX + pad;
  const rectY = phoneY + pad + offsetY;

  const svg = `<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${rectX}" y="${rectY}" width="${phoneW}" height="${phoneH}"
      rx="${bodyRadius}" ry="${bodyRadius}" fill="rgba(0,0,0,0.4)"/>
  </svg>`;

  return sharp(Buffer.from(svg))
    .blur(sigma)
    .extract({ left: pad, top: pad, width: canvasW, height: canvasH })
    .png()
    .toBuffer();
}

/** Build composite layers for a device frame at an absolute canvas position. */
export async function buildDeviceLayers(
  params: DevicePlacementParams,
): Promise<sharp.OverlayOptions[]> {
  const {
    input,
    spec,
    opts,
    panelW,
    canvasW,
    canvasH,
    phoneX,
    phoneY,
    widthScale,
    orientation,
    rotation = 0,
  } = params;

  const angle = Math.round(Number(rotation) || 0);

  if (!opts.deviceFrame) return [];

  const fc = getFrameConfig(spec);
  const { body: bodyColor, ring: ringColor } = resolveFrameColor(opts.frameColor);

  const phoneW = Math.round(panelW * fc.phoneScale * widthScale);
  const bezel = Math.round(phoneW * fc.bezelWidth);
  const screenW = phoneW - bezel * 2;
  const nativeW = orientation === 'portrait' ? spec.width : spec.height;
  const nativeH = orientation === 'portrait' ? spec.height : spec.width;
  const screenH = Math.round(screenW * (nativeH / nativeW));
  const phoneH = screenH + bezel * 2;

  const bodyRadius = Math.round(phoneW * fc.bodyRadius);
  const screenRadius = Math.round(phoneW * fc.screenRadius);
  const ringWidth = Math.max(2, Math.round(phoneW * 0.008));

  const resizedScreenshot = await sharp(input)
    .resize(screenW, screenH, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const screenMask = Buffer.from(
    `<svg width="${screenW}" height="${screenH}">
      <rect width="${screenW}" height="${screenH}" rx="${screenRadius}" ry="${screenRadius}" fill="white"/>
    </svg>`,
  );
  const maskedScreen = await sharp(resizedScreenshot)
    .ensureAlpha()
    .composite([{ input: screenMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Pack shadow, frame, screen, and overlays into one buffer so clipping never desyncs layers.
  const margin = Math.ceil(Math.max(phoneW, phoneH) * (angle !== 0 ? 0.6 : 0.2));
  const localW = phoneW + margin * 2;
  const localH = phoneH + margin * 2;
  const lx = margin;
  const ly = margin;

  const localShadow = opts.shadow
    ? await buildPhoneShadow(localW, localH, lx, ly, phoneW, phoneH, bodyRadius)
    : null;

  const localPhoneSvg = `<svg width="${localW}" height="${localH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${lx}" y="${ly}" width="${phoneW}" height="${phoneH}"
      rx="${bodyRadius}" ry="${bodyRadius}"
      fill="${bodyColor}" stroke="${ringColor}" stroke-width="${ringWidth}"/>
  </svg>`;

  const localOverlaysSvg = buildPhoneOverlaysSvg(
    localW, localH, lx, ly, phoneW, phoneH, bezel, fc,
  );

  const localLayers: sharp.OverlayOptions[] = [];
  if (localShadow) localLayers.push({ input: localShadow, top: 0, left: 0 });
  localLayers.push({ input: Buffer.from(localPhoneSvg), top: 0, left: 0 });
  localLayers.push({ input: maskedScreen, top: ly + bezel, left: lx + bezel });
  localLayers.push({ input: Buffer.from(localOverlaysSvg), top: 0, left: 0 });

  const localBg = await sharp({
    create: {
      width: localW,
      height: localH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  let deviceBuffer = await sharp(localBg).composite(localLayers).png().toBuffer();

  let left = phoneX - margin;
  let top = phoneY - margin;

  if (angle !== 0) {
    deviceBuffer = await sharp(deviceBuffer)
      .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const meta = await sharp(deviceBuffer).metadata();
    const rotW = meta.width ?? localW;
    const rotH = meta.height ?? localH;
    const centerX = phoneX + phoneW / 2;
    const centerY = phoneY + phoneH / 2;
    left = Math.round(centerX - rotW / 2);
    top = Math.round(centerY - rotH / 2);
  }

  return [{ input: deviceBuffer, left, top }];
}
