import { drawPanelTextOnCanvas } from './canvas-panel-text';
import { drawDeviceFrame } from './seamless-export';
import type { CustomFont, DeviceInfo, DevicePlacement, FrameOptions } from '../types';

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

/** Composite client-side device frame and text onto the server background — matches live preview. */
export async function exportSingleImage(params: {
  backgroundBlob: Blob;
  placement: DevicePlacement;
  device: DeviceInfo;
  orientation: 'portrait' | 'landscape';
  panelWidth: number;
  panelHeight: number;
  title?: string;
  subtitle?: string;
  options: Partial<FrameOptions>;
  customFonts: CustomFont[];
}): Promise<Blob> {
  const {
    backgroundBlob,
    placement,
    device,
    orientation,
    panelWidth,
    panelHeight,
    title,
    subtitle,
    options,
    customFonts,
  } = params;

  const bgUrl = URL.createObjectURL(backgroundBlob);
  try {
    const bgImg = await loadImage(bgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = panelWidth;
    canvas.height = panelHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.drawImage(bgImg, 0, 0, panelWidth, panelHeight);

    await drawDeviceFrame(
      ctx,
      placement,
      device,
      orientation,
      panelWidth,
      panelHeight,
      panelWidth,
      options,
    );

    await drawPanelTextOnCanvas(
      ctx,
      panelWidth,
      panelHeight,
      0,
      title,
      subtitle,
      options,
      customFonts,
    );

    return canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(bgUrl);
  }
}
