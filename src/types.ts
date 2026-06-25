import { z } from 'zod';

export interface DeviceSpec {
  /** Display name (e.g., "iPhone 6.9\"") */
  name: string;
  /** Device slug for CLI (e.g., "iphone-6.9") */
  slug: string;
  /** Portrait width in pixels */
  width: number;
  /** Portrait height in pixels */
  height: number;
  /** Platform */
  platform: 'ios' | 'android' | 'macos' | 'watchos' | 'tvos' | 'visionos';
  /** Device category */
  category: 'phone' | 'tablet' | 'desktop' | 'watch' | 'tv' | 'headset';
  /** Example devices */
  devices: string[];
  /** Device pixel ratio for capture viewport calculation */
  dpr: number;
}

export interface ScreenConfig {
  /** Screen identifier */
  name: string;
  /** URL path (e.g., "/home") */
  path: string;
  /** Promotional title text */
  title?: string;
  /** Promotional subtitle text */
  subtitle?: string;
  /** Wait for specific text before capturing */
  waitFor?: string;
  /** Wait delay in ms after page load */
  delay?: number;
}

export const frameOptionsSchema = z.object({
  background: z.string().default('#000000'),
  padding: z.number().min(0).max(0.4).default(0.08),
  borderRadius: z.number().min(0).max(0.2).default(0.04),
  titleColor: z.string().default('#ffffff'),
  subtitleColor: z.string().default('rgba(255,255,255,0.7)'),
  titleSize: z.number().min(0).max(0.2).default(0.087),
  subtitleSize: z.number().min(0).max(0.1).default(0.043),
  titleFont: z.string().default('Inter'),
  subtitleFont: z.string().default('Inter'),
  titleBold: z.boolean().default(true),
  subtitleBold: z.boolean().default(false),
  titleItalic: z.boolean().default(false),
  subtitleItalic: z.boolean().default(false),
  titleUnderline: z.boolean().default(false),
  subtitleUnderline: z.boolean().default(false),
  titleStrikethrough: z.boolean().default(false),
  subtitleStrikethrough: z.boolean().default(false),
  titleUppercase: z.boolean().default(false),
  subtitleUppercase: z.boolean().default(false),
  titleShadow: z.boolean().default(false),
  subtitleShadow: z.boolean().default(false),
  titleLetterSpacing: z.number().min(-0.05).max(0.3).optional(),
  subtitleLetterSpacing: z.number().min(-0.05).max(0.3).optional(),
  shadow: z.boolean().default(true),
  deviceFrame: z.boolean().default(true),
  frameColor: z.string().default('black'),
  textPosition: z.enum(['top', 'bottom']).default('bottom'),
  freePosition: z.boolean().optional(),
  titleX: z.number().min(0).max(1).optional(),
  titleY: z.number().min(0).max(1).optional(),
  subtitleX: z.number().min(0).max(1).optional(),
  subtitleY: z.number().min(0).max(1).optional(),
  titleBoxWidth: z.number().min(0.1).max(1).optional(),
  subtitleBoxWidth: z.number().min(0.1).max(1).optional(),
  /** Top-left X ratio of canvas width for the device frame */
  screenshotX: z.number().optional(),
  /** Top-left Y ratio of canvas height for the device frame */
  screenshotY: z.number().optional(),
  /** Width scale multiplier on default phone size */
  screenshotWidth: z.number().min(0.3).max(1.5).optional(),
  /** Rotation in degrees */
  screenshotRotation: z.number().min(-45).max(45).optional(),
  /** Snap screenshot movement to a resolution-based grid in the UI */
  gridAlign: z.boolean().optional(),
  /** Snap free-positioned text movement to a resolution-based grid in the UI */
  textGridAlign: z.boolean().optional(),
  textAlignH: z.enum(['left', 'center', 'right']).optional(),
  textAlignV: z.enum(['top', 'middle', 'bottom']).optional(),
  pattern: z.string().optional(),
  patternOpacity: z.number().min(0).max(1).default(0.1),
  patternColor: z.string().default('#ffffff'),
});

export type FrameOptions = z.infer<typeof frameOptionsSchema>;

export interface StickerPlacement {
  /** Image data */
  image: Buffer;
  /** Horizontal position as ratio of canvas width (0–1), top-left */
  x: number;
  /** Vertical position as ratio of canvas height (0–1), top-left */
  y: number;
  /** Width as ratio of canvas width (0–1) */
  width: number;
  /** Layer relative to device frame and text */
  layer: 'background' | 'behind-text' | 'foreground';
}

export interface CustomFont {
  /** Unique identifier — referenced as custom:{id} in titleFont/subtitleFont */
  id: string;
  /** CSS font-family name */
  family: string;
  /** Raw font file data */
  data: Buffer;
}

export interface SeamlessPanelText {
  title?: string;
  subtitle?: string;
  style?: Partial<FrameOptions>;
}

export interface SeamlessDevicePlacement {
  id: string;
  image: Buffer;
  /** Top-left X as ratio of wide canvas width (can be negative or > 1) */
  x: number;
  /** Top-left Y as ratio of panel height */
  y: number;
  /** Phone width as ratio of single panel width */
  width: number;
  /** Rotation in degrees */
  rotation: number;
}

export const configSchema = z.object({
  devices: z.array(z.string()).default(['iphone-6.9']),
  frame: frameOptionsSchema.partial().default({}),
  capture: z
    .object({
      baseUrl: z.string().url(),
      screens: z.array(
        z.object({
          name: z.string(),
          path: z.string(),
          title: z.string().optional(),
          subtitle: z.string().optional(),
          waitFor: z.string().optional(),
          delay: z.number().optional(),
        })
      ),
    })
    .optional(),
  output: z.string().default('./screenshots'),
});

export type AppShotsConfig = z.infer<typeof configSchema>;

export interface ValidationResult {
  file: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  matches: DeviceSpec[];
  valid: boolean;
  issues: string[];
}
