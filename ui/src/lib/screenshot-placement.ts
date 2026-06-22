import { getPhoneDimensions } from './device-bounds';
import type { DeviceInfo } from '../types';

export interface ScreenshotPlacement {
  x: number;
  y: number;
  width: number;
  rotation: number;
}

const GRID_COLS = 12;

export function getGridDimensions(canvasW: number, canvasH: number): { cols: number; rows: number } {
  const cols = GRID_COLS;
  const rows = Math.max(1, Math.round(cols * (canvasH / canvasW)));
  return { cols, rows };
}

export function getDefaultScreenshotPlacement(
  device: DeviceInfo,
  orientation: 'portrait' | 'landscape',
  textPosition: 'top' | 'bottom' = 'bottom',
  widthScale = 1,
): ScreenshotPlacement {
  const canvasW = orientation === 'portrait' ? device.width : device.height;
  const canvasH = orientation === 'portrait' ? device.height : device.width;
  const { phoneW, phoneH } = getPhoneDimensions(device, canvasW, widthScale, orientation);

  const x = (canvasW - phoneW) / (2 * canvasW);
  let phoneY: number;
  if (textPosition === 'top') {
    phoneY = canvasH - phoneH + Math.round(phoneH * 0.056);
  } else {
    phoneY = -Math.round(phoneH * 0.074);
  }

  return {
    x,
    y: phoneY / canvasH,
    width: widthScale,
    rotation: 0,
  };
}

export function placementFromOptions(
  options: {
    screenshotX?: number;
    screenshotY?: number;
    screenshotWidth?: number;
    screenshotRotation?: number;
  },
  device: DeviceInfo,
  orientation: 'portrait' | 'landscape',
  textPosition: 'top' | 'bottom' = 'bottom',
): ScreenshotPlacement {
  const defaults = getDefaultScreenshotPlacement(device, orientation, textPosition);
  return {
    x: options.screenshotX ?? defaults.x,
    y: options.screenshotY ?? defaults.y,
    width: options.screenshotWidth ?? defaults.width,
    rotation: options.screenshotRotation ?? defaults.rotation,
  };
}

export type ScreenshotAlignH = 'left' | 'center' | 'right';
export type ScreenshotAlignV = 'top' | 'middle' | 'bottom';

export function applyScreenshotAlign(
  placement: ScreenshotPlacement,
  alignH: ScreenshotAlignH | null,
  alignV: ScreenshotAlignV | null,
  device: DeviceInfo,
  orientation: 'portrait' | 'landscape',
): ScreenshotPlacement {
  const canvasW = orientation === 'portrait' ? device.width : device.height;
  const canvasH = orientation === 'portrait' ? device.height : device.width;
  const { phoneW, phoneH } = getPhoneDimensions(device, canvasW, placement.width, orientation);
  const phoneWRatio = phoneW / canvasW;
  const phoneHRatio = phoneH / canvasH;
  const margin = 0.04;

  let { x, y } = placement;

  if (alignH === 'left') x = margin;
  else if (alignH === 'center') x = (1 - phoneWRatio) / 2;
  else if (alignH === 'right') x = 1 - phoneWRatio - margin;

  if (alignV === 'top') y = margin;
  else if (alignV === 'middle') y = (1 - phoneHRatio) / 2;
  else if (alignV === 'bottom') y = 1 - phoneHRatio - margin;

  return { ...placement, x, y };
}

export function snapPlacementToGrid(
  placement: ScreenshotPlacement,
  device: DeviceInfo,
  orientation: 'portrait' | 'landscape',
  gridAlign: boolean,
): ScreenshotPlacement {
  if (!gridAlign) return placement;

  const canvasW = orientation === 'portrait' ? device.width : device.height;
  const canvasH = orientation === 'portrait' ? device.height : device.width;
  const { cols, rows } = getGridDimensions(canvasW, canvasH);
  const cellW = 1 / cols;
  const cellH = 1 / rows;

  return {
    ...placement,
    x: Math.round(placement.x / cellW) * cellW,
    y: Math.round(placement.y / cellH) * cellH,
  };
}

export function snapTextToGrid(
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  textGridAlign: boolean,
): { x: number; y: number } {
  if (!textGridAlign) return { x, y };

  const { cols, rows } = getGridDimensions(canvasW, canvasH);
  const cellW = 1 / cols;
  const cellH = 1 / rows;

  return {
    x: Math.round(x / cellW) * cellW,
    y: Math.round(y / cellH) * cellH,
  };
}

export function placementToPatch(placement: ScreenshotPlacement): {
  screenshotX: number;
  screenshotY: number;
  screenshotWidth: number;
  screenshotRotation: number;
} {
  return {
    screenshotX: placement.x,
    screenshotY: placement.y,
    screenshotWidth: placement.width,
    screenshotRotation: placement.rotation,
  };
}
