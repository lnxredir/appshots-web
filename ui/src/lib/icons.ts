import type { IconifyJSON } from '@iconify/types';
import { getIconData } from '@iconify/utils/lib/icon-set/get-icon';
import { iconToSVG } from '@iconify/utils/lib/svg/build';
import type { IconNode } from 'lucide';
import type { OverlayLayer, Sticker } from '../types';

type LucideIcons = Record<string, IconNode[]>;

export const ICON_PACKS = [
  { id: 'lucide', label: 'Lucide' },
  { id: 'tabler', label: 'Tabler Icons' },
  { id: 'mdi', label: 'Material Design' },
  { id: 'ri', label: 'Remix Icon' },
  { id: 'ph', label: 'Phosphor' },
  { id: 'fa6-solid', label: 'Font Awesome' },
] as const;

export type IconPackId = (typeof ICON_PACKS)[number]['id'];

type IconifyPackId = Exclude<IconPackId, 'lucide'>;

interface LoadedPack {
  names: string[];
  toSvg: (iconName: string, color: string, size: number) => string | null;
}

const packCache = new Map<IconPackId, LoadedPack>();

const ICONIFY_IMPORTS: Record<IconifyPackId, () => Promise<{ default: IconifyJSON }>> = {
  tabler: () => import('@iconify-json/tabler/icons.json'),
  mdi: () => import('@iconify-json/mdi/icons.json'),
  ri: () => import('@iconify-json/ri/icons.json'),
  ph: () => import('@iconify-json/ph/icons.json'),
  'fa6-solid': () => import('@iconify-json/fa6-solid/icons.json'),
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLucideNode([tag, attrs, children]: IconNode): string {
  const attrStr = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeXml(String(value))}"`)
    .join(' ');
  if (children?.length) {
    return `<${tag} ${attrStr}>${children.map(renderLucideNode).join('')}</${tag}>`;
  }
  return `<${tag} ${attrStr}/>`;
}

function filterIconNames(pack: IconPackId, names: string[]): string[] {
  switch (pack) {
    case 'ri':
      return names.filter((name) => name.endsWith('-line'));
    case 'ph':
      return names.filter((name) => !/-(?:bold|duotone|fill|light|thin)$/.test(name));
    default:
      return names;
  }
}

function iconifyToSvg(iconSet: IconifyJSON, iconName: string, color: string, size: number): string | null {
  const icon = getIconData(iconSet, iconName);
  if (!icon) return null;

  const rendered = iconToSVG(icon, { height: `${size}`, width: `${size}` });
  const body = rendered.body.replace(/currentColor/g, escapeXml(color));
  const attrs = Object.entries(rendered.attributes)
    .map(([key, value]) => `${key}="${escapeXml(String(value))}"`)
    .join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
}

async function loadLucidePack(): Promise<LoadedPack> {
  const icons = (await import('lucide')).icons as LucideIcons;
  const names = Object.keys(icons);

  return {
    names,
    toSvg(iconName, color, size) {
      const icon = icons[iconName];
      if (!icon) return null;
      const body = icon.map((node) => renderLucideNode(node)).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${escapeXml(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    },
  };
}

async function loadIconifyPack(pack: IconifyPackId): Promise<LoadedPack> {
  const iconSet = (await ICONIFY_IMPORTS[pack]()).default;
  const names = filterIconNames(pack, Object.keys(iconSet.icons)).sort();

  return {
    names,
    toSvg(iconName, color, size) {
      return iconifyToSvg(iconSet, iconName, color, size);
    },
  };
}

async function loadPack(pack: IconPackId): Promise<LoadedPack> {
  const cached = packCache.get(pack);
  if (cached) return cached;

  const loaded = pack === 'lucide' ? await loadLucidePack() : await loadIconifyPack(pack);
  packCache.set(pack, loaded);
  return loaded;
}

export function iconDisplayName(name: string, pack?: IconPackId): string {
  let label = name;
  if (pack === 'ri' && label.endsWith('-line')) {
    label = label.slice(0, -5);
  }
  label = label.replace(/-(?:line|solid)$/, '');

  if (label.includes('-')) {
    return label.replace(/-/g, ' ');
  }

  return label
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();
}

export function iconSearchText(name: string, pack?: IconPackId): string {
  return `${name} ${iconDisplayName(name, pack)}`.toLowerCase();
}

export async function getIconPackCount(pack: IconPackId): Promise<number> {
  return (await loadPack(pack)).names.length;
}

export async function searchIcons(
  query: string,
  pack: IconPackId = 'lucide',
  limit = 48,
): Promise<string[]> {
  const { names } = await loadPack(pack);
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return names.slice(0, limit);
  return names.filter((name) => iconSearchText(name, pack).includes(trimmed)).slice(0, limit);
}

export async function iconToSvg(
  iconName: string,
  color = '#ffffff',
  size = 24,
  pack: IconPackId = 'lucide',
): Promise<string | null> {
  return (await loadPack(pack)).toSvg(iconName, color, size);
}

export async function iconSvgFile(
  iconName: string,
  color = '#ffffff',
  pack: IconPackId = 'lucide',
): Promise<File | null> {
  const svg = await iconToSvg(iconName, color, 24, pack);
  if (!svg) return null;
  return new File([svg], `${iconName}.svg`, { type: 'image/svg+xml' });
}

export function createIconId(): string {
  return `icon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createIconSticker(params: {
  iconPack?: IconPackId;
  iconName: string;
  iconColor?: string;
  x?: number;
  y?: number;
  width?: number;
  layer?: OverlayLayer;
  wideRatio?: number;
}): Promise<Sticker> {
  const {
    iconPack = 'lucide',
    iconName,
    iconColor = '#ffffff',
    x = 0.12,
    y = 0.12,
    width = 0.08,
    layer = 'foreground',
    wideRatio = 1,
  } = params;

  const file = await iconSvgFile(iconName, iconColor, iconPack);
  if (!file) {
    throw new Error(`Unknown icon: ${iconName}`);
  }

  const url = URL.createObjectURL(file);

  return {
    id: createIconId(),
    file,
    url,
    name: iconDisplayName(iconName, iconPack),
    x: x / wideRatio,
    y,
    width: width / wideRatio,
    aspectRatio: 1,
    layer,
    source: 'icon',
    iconPack,
    iconName,
    iconColor,
  };
}

export async function refreshIconSticker(
  sticker: Sticker,
  patch: Partial<Pick<Sticker, 'iconColor' | 'iconName'>>,
): Promise<Sticker> {
  if (sticker.source !== 'icon' || !sticker.iconName) return sticker;

  const iconPack = (sticker.iconPack as IconPackId | undefined) ?? 'lucide';
  const iconName = patch.iconName ?? sticker.iconName;
  const iconColor = patch.iconColor ?? sticker.iconColor ?? '#ffffff';
  const file = await iconSvgFile(iconName, iconColor, iconPack);
  if (!file) return sticker;

  URL.revokeObjectURL(sticker.url);
  const url = URL.createObjectURL(file);

  return {
    ...sticker,
    ...patch,
    file,
    url,
    iconName,
    iconColor,
    name: iconDisplayName(iconName, iconPack),
  };
}

export function layerZIndex(layer: OverlayLayer): number {
  switch (layer) {
    case 'background':
      return 2;
    case 'behind-text':
      return 6;
    case 'foreground':
      return 20;
    default:
      return 5;
  }
}

export function layerLabel(layer: OverlayLayer): string {
  switch (layer) {
    case 'background':
      return 'Behind phone';
    case 'behind-text':
      return 'Behind text';
    case 'foreground':
      return 'On top';
  }
}
