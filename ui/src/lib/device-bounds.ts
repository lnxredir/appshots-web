import type { DeviceInfo } from '../types';

interface FrameConfig {
  bezelWidth: number;
  bodyRadius: number;
  screenRadius: number;
  phoneScale: number;
}

function getFrameConfig(device: DeviceInfo): FrameConfig {
  if (device.platform === 'ios' && device.category === 'phone') {
    const isOlder = device.slug === 'iphone-5.5' || device.slug === 'iphone-4.7';
    if (isOlder) {
      return { bezelWidth: 0.05, bodyRadius: 0.1, screenRadius: 0.03, phoneScale: 0.775 };
    }
    return { bezelWidth: 0.04, bodyRadius: 0.176, screenRadius: 0.136, phoneScale: 0.775 };
  }

  if (device.category === 'tablet') {
    return { bezelWidth: 0.025, bodyRadius: 0.06, screenRadius: 0.045, phoneScale: 0.88 };
  }

  if (device.category === 'phone') {
    return { bezelWidth: 0.035, bodyRadius: 0.14, screenRadius: 0.11, phoneScale: 0.775 };
  }

  return { bezelWidth: 0.03, bodyRadius: 0.05, screenRadius: 0.04, phoneScale: 0.85 };
}

export function getPhoneDimensions(
  device: DeviceInfo,
  panelW: number,
  widthScale: number,
  orientation: 'portrait' | 'landscape',
): { phoneW: number; phoneH: number } {
  const fc = getFrameConfig(device);
  const phoneW = panelW * fc.phoneScale * widthScale;
  const bezel = phoneW * fc.bezelWidth;
  const screenW = phoneW - bezel * 2;
  const nativeW = orientation === 'portrait' ? device.width : device.height;
  const nativeH = orientation === 'portrait' ? device.height : device.width;
  const screenH = screenW * (nativeH / nativeW);
  const phoneH = screenH + bezel * 2;
  return { phoneW, phoneH };
}

export function getPhoneFrameMetrics(
  device: DeviceInfo,
  panelW: number,
  widthScale: number,
  orientation: 'portrait' | 'landscape',
): { phoneW: number; phoneH: number; bezel: number; bodyRadius: number; screenRadius: number } {
  const fc = getFrameConfig(device);
  const { phoneW, phoneH } = getPhoneDimensions(device, panelW, widthScale, orientation);
  return {
    phoneW,
    phoneH,
    bezel: phoneW * fc.bezelWidth,
    bodyRadius: phoneW * fc.bodyRadius,
    screenRadius: phoneW * fc.screenRadius,
  };
}

export function defaultDevicePlacement(
  panelCount: number,
  device: DeviceInfo,
  orientation: 'portrait' | 'landscape',
  widthScale = 0.85,
): { x: number; y: number; width: number; rotation: number } {
  const panelW = orientation === 'portrait' ? device.width : device.height;
  const panelH = orientation === 'portrait' ? device.height : device.width;
  const { phoneW, phoneH } = getPhoneDimensions(device, panelW, widthScale, orientation);

  const phoneWidthRatio = phoneW / (panelW * panelCount);
  const x = (1 - phoneWidthRatio) / 2;
  const y = (panelH - phoneH) / (2 * panelH);

  return { x, y, width: widthScale, rotation: 0 };
}
