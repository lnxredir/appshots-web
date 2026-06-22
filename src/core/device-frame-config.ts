import type { DeviceSpec } from '../types.js';

export interface DeviceFrameConfig {
  bezelWidth: number;
  bodyRadius: number;
  screenRadius: number;
  dynamicIsland: boolean;
  homeButton: boolean;
  notchWidth: number;
  notchHeight: number;
  homeBarWidth: number;
  homeBarHeight: number;
  phoneScale: number;
}

export interface FrameColor {
  body: string;
  ring: string;
}

const FRAME_COLORS: Record<string, FrameColor> = {
  black: { body: '#1a1a1a', ring: '#333333' },
  silver: { body: '#C8C8CD', ring: '#E0E0E5' },
  gold: { body: '#A0824E', ring: '#C8A870' },
  blue: { body: '#1A2F4F', ring: '#2C4A7C' },
  red: { body: '#5C1010', ring: '#8B2020' },
  white: { body: '#E8E8E8', ring: '#FFFFFF' },
};

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function darken(hex: string, pct: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(
    Math.max(0, Math.round(r * (1 - pct / 100))),
    Math.max(0, Math.round(g * (1 - pct / 100))),
    Math.max(0, Math.round(b * (1 - pct / 100))),
  );
}

export function resolveFrameColor(frameColor: string): FrameColor {
  if (FRAME_COLORS[frameColor]) return FRAME_COLORS[frameColor];
  return { body: darken(frameColor, 20), ring: frameColor };
}

export function getFrameConfig(spec: DeviceSpec): DeviceFrameConfig {
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
