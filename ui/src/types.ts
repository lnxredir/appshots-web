export interface FrameOptions {
  background?: string;
  padding?: number;
  borderRadius?: number;
  titleColor?: string;
  subtitleColor?: string;
  titleSize?: number;
  subtitleSize?: number;
  titleFont?: string;
  subtitleFont?: string;
  titleBold?: boolean;
  subtitleBold?: boolean;
  titleItalic?: boolean;
  subtitleItalic?: boolean;
  titleUnderline?: boolean;
  subtitleUnderline?: boolean;
  titleStrikethrough?: boolean;
  subtitleStrikethrough?: boolean;
  titleUppercase?: boolean;
  subtitleUppercase?: boolean;
  titleShadow?: boolean;
  subtitleShadow?: boolean;
  titleLetterSpacing?: number;
  subtitleLetterSpacing?: number;
  shadow?: boolean;
  deviceFrame?: boolean;
  frameColor?: string;
  textPosition?: 'top' | 'bottom';
  freePosition?: boolean;
  titleX?: number;
  titleY?: number;
  subtitleX?: number;
  subtitleY?: number;
  /** Top-left X ratio of canvas width for the device frame */
  screenshotX?: number;
  /** Top-left Y ratio of canvas height for the device frame */
  screenshotY?: number;
  /** Width scale multiplier on default phone size */
  screenshotWidth?: number;
  /** Rotation in degrees */
  screenshotRotation?: number;
  /** Snap screenshot movement to a resolution-based grid in the UI */
  gridAlign?: boolean;
  /** Snap free-positioned text movement to a resolution-based grid in the UI */
  textGridAlign?: boolean;
  /** Horizontal text alignment within each panel */
  textAlignH?: 'left' | 'center' | 'right';
  /** Vertical text alignment within each panel */
  textAlignV?: 'top' | 'middle' | 'bottom';
  pattern?: string;
  patternOpacity?: number;
  patternColor?: string;
}

export interface DeviceInfo {
  name: string;
  slug: string;
  width: number;
  height: number;
  platform: string;
  category: string;
  devices: string[];
}

export interface FrameSettings {
  device: string;
  title: string;
  subtitle: string;
  orientation: 'portrait' | 'landscape';
  mode: 'single' | 'seamless';
  panelCount: number;
  panels: SeamlessPanelConfig[];
  options: Partial<FrameOptions>;
}

export interface SeamlessPanelConfig {
  title: string;
  subtitle: string;
  /** Per-panel overrides for text position and title/subtitle styling */
  style?: Partial<PanelTextStyle>;
}

/** Text-related options that can be set per panel in seamless mode */
export type PanelTextStyle = Pick<
  FrameOptions,
  | 'textPosition'
  | 'titleSize'
  | 'subtitleSize'
  | 'titleFont'
  | 'subtitleFont'
  | 'titleColor'
  | 'subtitleColor'
  | 'titleBold'
  | 'subtitleBold'
  | 'titleItalic'
  | 'subtitleItalic'
  | 'titleUnderline'
  | 'subtitleUnderline'
  | 'titleStrikethrough'
  | 'subtitleStrikethrough'
  | 'titleUppercase'
  | 'subtitleUppercase'
  | 'titleShadow'
  | 'subtitleShadow'
  | 'titleLetterSpacing'
  | 'subtitleLetterSpacing'
  | 'freePosition'
  | 'titleX'
  | 'titleY'
  | 'subtitleX'
  | 'subtitleY'
  | 'textGridAlign'
  | 'textAlignH'
  | 'textAlignV'
>;

export interface DevicePlacement {
  id: string;
  file: File;
  url: string;
  name: string;
  /** Top-left X ratio on wide canvas */
  x: number;
  /** Top-left Y ratio on panel height */
  y: number;
  /** Width ratio relative to single panel width */
  width: number;
  rotation: number;
}

export type OverlayLayer = 'background' | 'behind-text' | 'foreground';

export const OVERLAY_LAYERS: { value: OverlayLayer; label: string; description: string }[] = [
  {
    value: 'background',
    label: 'Behind phone',
    description: 'Above the background, below the device frame',
  },
  {
    value: 'behind-text',
    label: 'Behind text',
    description: 'Above the device frame, below title and subtitle',
  },
  {
    value: 'foreground',
    label: 'On top',
    description: 'Above everything including text and device frame',
  },
];
export interface DevicePlacementMeta {
  id: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
}

export interface Sticker {
  id: string;
  file: File;
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  aspectRatio: number;
  layer: OverlayLayer;
  source?: 'upload' | 'icon';
  iconPack?: string;
  iconName?: string;
  iconColor?: string;
}

export interface StickerMeta {
  id: string;
  x: number;
  y: number;
  width: number;
  layer: OverlayLayer;
}

export interface CustomFont {
  id: string;
  file: File;
  url: string;
  name: string;
  family: string;
}

export interface CustomFontMeta {
  id: string;
  family: string;
}

export const FONT_FAMILIES = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Roboto',
  'Open Sans',
  'Lora',
  'Playfair Display',
  'Oswald',
  'Raleway',
  'Space Grotesk',
  'DM Sans',
  'Nunito',
  'Merriweather',
  'Bebas Neue',
  'System UI',
] as const;

export const GRADIENT_PRESETS = [
  { label: 'Purple', value: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { label: 'Teal', value: 'linear-gradient(170deg, #134E4A, #14B8A6)' },
  { label: 'Sunset', value: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { label: 'Ocean', value: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
  { label: 'Midnight', value: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { label: 'Forest', value: 'linear-gradient(135deg, #134E5E, #71B280)' },
  { label: 'Dark', value: '#1a1a2e' },
  { label: 'Black', value: '#000000' },
] as const;

export const FRAME_COLORS = [
  { label: 'Black', value: 'black' },
  { label: 'Silver', value: 'silver' },
  { label: 'Gold', value: 'gold' },
  { label: 'Blue', value: 'blue' },
  { label: 'Red', value: 'red' },
  { label: 'White', value: 'white' },
] as const;

export const PATTERNS = [
  { label: 'None', value: '' },
  { label: 'Dots', value: 'dots' },
  { label: 'Grid', value: 'grid' },
  { label: 'Diagonal', value: 'diagonal' },
  { label: 'Waves', value: 'waves' },
  { label: 'Diamonds', value: 'diamonds' },
  { label: 'Cross dots', value: 'cross-dots' },
] as const;

export const DEFAULT_SETTINGS: FrameSettings = {
  device: 'iphone-6.9',
  title: 'Your App Name',
  subtitle: 'Your tagline here',
  orientation: 'portrait',
  mode: 'single',
  panelCount: 3,
  panels: [
    { title: 'Search. Book.', subtitle: 'Travel. Explore.' },
    { title: '', subtitle: '' },
    { title: 'View Listings', subtitle: '' },
  ],
  options: {
    background: GRADIENT_PRESETS[0].value,
    padding: 0.08,
    borderRadius: 0.04,
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.7)',
    titleFont: 'Inter',
    subtitleFont: 'Inter',
    titleBold: true,
    subtitleBold: false,
    titleItalic: false,
    subtitleItalic: false,
    titleUnderline: false,
    subtitleUnderline: false,
    titleStrikethrough: false,
    subtitleStrikethrough: false,
    titleUppercase: false,
    subtitleUppercase: false,
    titleShadow: false,
    subtitleShadow: false,
    titleLetterSpacing: 0.08,
    subtitleLetterSpacing: 0.01,
    shadow: true,
    deviceFrame: true,
    frameColor: 'black',
    textPosition: 'bottom',
    pattern: undefined,
    patternOpacity: 0.1,
  },
};
