import { getPhoneDimensions } from './device-bounds';
import type { DeviceInfo } from '../types';

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PlacementInput {
  x: number;
  y: number;
  width: number;
  rotation?: number;
}

export function getDeviceScreenRect(
  placement: PlacementInput,
  device: DeviceInfo,
  panelWidth: number,
  panelHeight: number,
  wideW: number,
  orientation: 'portrait' | 'landscape',
  imageWidth: number,
  imageHeight: number,
): ScreenRect {
  const { phoneW, phoneH } = getPhoneDimensions(device, panelWidth, placement.width, orientation);
  const scaleX = imageWidth / wideW;
  const scaleY = imageHeight / panelHeight;

  return {
    left: placement.x * wideW * scaleX,
    top: placement.y * panelHeight * scaleY,
    width: phoneW * scaleX,
    height: phoneH * scaleY,
  };
}

export function getRotatedAabb(rect: ScreenRect, rotationDeg: number): ScreenRect {
  if (!rotationDeg) return rect;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const aabbW = rect.width * cos + rect.height * sin;
  const aabbH = rect.width * sin + rect.height * cos;

  return {
    left: cx - aabbW / 2,
    top: cy - aabbH / 2,
    width: aabbW,
    height: aabbH,
  };
}

export function rectOverflowsCanvas(rect: ScreenRect, canvasW: number, canvasH: number): boolean {
  return (
    rect.left < 0 ||
    rect.top < 0 ||
    rect.left + rect.width > canvasW ||
    rect.top + rect.height > canvasH
  );
}

/** Screen-space regions where the device extends outside the export canvas. */
export function getOutsideCanvasRegions(
  device: ScreenRect,
  canvasW: number,
  canvasH: number,
): ScreenRect[] {
  const dl = device.left;
  const dt = device.top;
  const dr = device.left + device.width;
  const db = device.top + device.height;
  const regions: ScreenRect[] = [];

  if (dl < 0) {
    regions.push({
      left: dl,
      top: Math.max(0, dt),
      width: -dl,
      height: Math.min(db, canvasH) - Math.max(0, dt),
    });
  }

  if (dr > canvasW) {
    regions.push({
      left: canvasW,
      top: Math.max(0, dt),
      width: dr - canvasW,
      height: Math.min(db, canvasH) - Math.max(0, dt),
    });
  }

  if (dt < 0) {
    regions.push({
      left: Math.max(0, dl),
      top: dt,
      width: Math.min(dr, canvasW) - Math.max(0, dl),
      height: -dt,
    });
  }

  if (db > canvasH) {
    regions.push({
      left: Math.max(0, dl),
      top: canvasH,
      width: Math.min(dr, canvasW) - Math.max(0, dl),
      height: db - canvasH,
    });
  }

  return regions.filter((r) => r.width > 0.5 && r.height > 0.5);
}

export function getPlacementOverflow(
  placement: PlacementInput,
  device: DeviceInfo,
  panelWidth: number,
  panelHeight: number,
  wideW: number,
  orientation: 'portrait' | 'landscape',
  imageWidth: number,
  imageHeight: number,
): { hasOverflow: boolean; regions: ScreenRect[] } {
  const screenRect = getDeviceScreenRect(
    placement,
    device,
    panelWidth,
    panelHeight,
    wideW,
    orientation,
    imageWidth,
    imageHeight,
  );
  const bounds = getRotatedAabb(screenRect, placement.rotation ?? 0);
  const regions = getOutsideCanvasRegions(bounds, imageWidth, imageHeight);

  return {
    hasOverflow: regions.length > 0,
    regions,
  };
}
