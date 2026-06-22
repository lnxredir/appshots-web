// Public API for programmatic usage
export { frameScreenshot } from './core/framer.js';
export { frameSeamless } from './core/seamless.js';
export { captureScreenshots } from './core/capturer.js';
export { validateScreenshots, validateFile } from './core/validator.js';
export { getDevice, findDeviceByDimensions, listDevices, devices } from './devices.js';
export { getFrameConfig } from './core/device-frame-config.js';
export { defineConfig, loadConfig } from './config.js';
export { FONT_FAMILIES } from './core/text-styles.js';
export type {
  DeviceSpec,
  ScreenConfig,
  FrameOptions,
  AppShotsConfig,
  ValidationResult,
  StickerPlacement,
  CustomFont,
  SeamlessPanelText,
  SeamlessDevicePlacement,
} from './types.js';
export type { SeamlessResult } from './core/seamless.js';
