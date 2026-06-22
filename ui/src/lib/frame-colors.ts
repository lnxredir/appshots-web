const FRAME_COLORS: Record<string, { body: string; ring: string }> = {
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

export function resolveFrameColor(frameColor = 'black'): { body: string; ring: string } {
  if (FRAME_COLORS[frameColor]) return FRAME_COLORS[frameColor];
  return { body: darken(frameColor, 20), ring: frameColor };
}

export interface DeviceFrameOptions {
  deviceFrame?: boolean;
  shadow?: boolean;
  frameColor?: string;
}
