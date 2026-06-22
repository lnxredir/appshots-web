import { getPhoneFrameMetrics } from './device-bounds';
import { resolveFrameColor, type DeviceFrameOptions } from './frame-colors';
import type { DeviceInfo, DevicePlacement } from '../types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export canvas'));
    }, type);
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function drawDeviceFrame(
  ctx: CanvasRenderingContext2D,
  placement: DevicePlacement,
  device: DeviceInfo,
  orientation: 'portrait' | 'landscape',
  panelW: number,
  panelH: number,
  wideW: number,
  frameOptions: DeviceFrameOptions,
): Promise<void> {
  const showFrame = frameOptions.deviceFrame ?? true;
  const showShadow = frameOptions.shadow ?? true;
  const { body, ring } = resolveFrameColor(frameOptions.frameColor);

  const { phoneW, phoneH, bezel, bodyRadius, screenRadius } = getPhoneFrameMetrics(
    device,
    panelW,
    placement.width,
    orientation,
  );
  const cx = placement.x * wideW + phoneW / 2;
  const cy = placement.y * panelH + phoneH / 2;
  const screenshot = await loadImage(placement.url);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((placement.rotation * Math.PI) / 180);

  const sx = -phoneW / 2 + (showFrame ? bezel : 0);
  const sy = -phoneH / 2 + (showFrame ? bezel : 0);
  const sw = showFrame ? phoneW - bezel * 2 : phoneW;
  const sh = showFrame ? phoneH - bezel * 2 : phoneH;
  const outerRadius = showFrame ? bodyRadius : screenRadius;

  if (showShadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = phoneW * 0.08;
    ctx.shadowOffsetY = phoneH * 0.05;
    ctx.fillStyle = showFrame ? body : 'rgba(0,0,0,0.01)';
    roundRectPath(ctx, -phoneW / 2, -phoneH / 2, phoneW, phoneH, outerRadius);
    ctx.fill();
    ctx.restore();
  }

  if (showFrame) {
    ctx.fillStyle = body;
    roundRectPath(ctx, -phoneW / 2, -phoneH / 2, phoneW, phoneH, bodyRadius);
    ctx.fill();
    ctx.strokeStyle = ring;
    ctx.lineWidth = Math.max(2, phoneW * 0.008);
    roundRectPath(ctx, -phoneW / 2, -phoneH / 2, phoneW, phoneH, bodyRadius);
    ctx.stroke();
  }

  ctx.save();
  roundRectPath(ctx, sx, sy, sw, sh, screenRadius);
  ctx.clip();

  const imgAspect = screenshot.naturalWidth / screenshot.naturalHeight;
  const screenAspect = sw / sh;
  let dw: number;
  let dh: number;
  let dx: number;
  let dy: number;
  if (imgAspect > screenAspect) {
    dh = sh;
    dw = sh * imgAspect;
    dx = sx - (dw - sw) / 2;
    dy = sy;
  } else {
    dw = sw;
    dh = sw / imgAspect;
    dx = sx;
    dy = sy;
  }
  ctx.drawImage(screenshot, dx, dy, dw, dh);
  ctx.restore();

  ctx.restore();
}

/** Composite client-side device frames onto the server background — matches live preview. */
export async function exportSeamlessPanels(params: {
  wideBackgroundBlob: Blob;
  devicePlacements: DevicePlacement[];
  device: DeviceInfo;
  orientation: 'portrait' | 'landscape';
  panelCount: number;
  panelWidth: number;
  panelHeight: number;
  frameOptions: DeviceFrameOptions;
}): Promise<Blob[]> {
  const {
    wideBackgroundBlob,
    devicePlacements,
    device,
    orientation,
    panelCount,
    panelWidth,
    panelHeight,
    frameOptions,
  } = params;

  const wideW = panelWidth * panelCount;
  const wideH = panelHeight;
  const bgUrl = URL.createObjectURL(wideBackgroundBlob);

  try {
    const bgImg = await loadImage(bgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = wideW;
    canvas.height = wideH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.drawImage(bgImg, 0, 0, wideW, wideH);

    for (const placement of devicePlacements) {
      await drawDeviceFrame(
        ctx,
        placement,
        device,
        orientation,
        panelWidth,
        panelHeight,
        wideW,
        frameOptions,
      );
    }

    const panels: Blob[] = [];
    for (let i = 0; i < panelCount; i++) {
      const panelCanvas = document.createElement('canvas');
      panelCanvas.width = panelWidth;
      panelCanvas.height = panelHeight;
      const pctx = panelCanvas.getContext('2d');
      if (!pctx) throw new Error('Canvas not supported');
      pctx.drawImage(
        canvas,
        i * panelWidth,
        0,
        panelWidth,
        panelHeight,
        0,
        0,
        panelWidth,
        panelHeight,
      );
      panels.push(await canvasToBlob(panelCanvas));
    }

    return panels;
  } finally {
    URL.revokeObjectURL(bgUrl);
  }
}
