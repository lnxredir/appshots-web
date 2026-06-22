import type { CustomFont, CustomFontMeta, DeviceInfo, DevicePlacement, DevicePlacementMeta, FrameSettings, Sticker, StickerMeta } from '../types';

function base64ToBlob(base64: string, type = 'image/png'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function fetchDevices(): Promise<DeviceInfo[]> {
  const res = await fetch('/api/devices');
  if (!res.ok) throw new Error('Failed to load devices');
  return res.json();
}

export async function frameImage(
  image: File,
  settings: FrameSettings,
  stickers: Sticker[] = [],
  customFonts: CustomFont[] = [],
  options: { includeDevice?: boolean; includeText?: boolean; signal?: AbortSignal } = {},
): Promise<Blob> {
  const { includeDevice = true, includeText = true, signal } = options;
  const form = new FormData();
  form.append('image', image);
  form.append('device', settings.device);
  form.append('orientation', settings.orientation);
  if (settings.title) form.append('title', settings.title);
  if (settings.subtitle) form.append('subtitle', settings.subtitle);
  form.append('options', JSON.stringify(settings.options));
  form.append('includeDevice', includeDevice ? '1' : '0');
  form.append('includeText', includeText ? '1' : '0');

  if (stickers.length > 0) {
    const meta: StickerMeta[] = stickers.map(({ id, x, y, width, layer }) => ({
      id,
      x,
      y,
      width,
      layer,
    }));
    form.append('stickers', JSON.stringify(meta));
    for (const sticker of stickers) {
      form.append(`sticker_${sticker.id}`, sticker.file);
    }
  }

  if (customFonts.length > 0) {
    const fontMeta: CustomFontMeta[] = customFonts.map(({ id, family }) => ({ id, family }));
    form.append('customFonts', JSON.stringify(fontMeta));
    for (const font of customFonts) {
      form.append(`font_${font.id}`, font.file);
    }
  }

  const res = await fetch('/api/frame', { method: 'POST', body: form, signal });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Failed to frame screenshot');
  }
  return res.blob();
}

export interface SeamlessFrameResult {
  wide: Blob;
  panels: Blob[];
}

/** Fast preview resolution — full quality is used on download only. */
export const SEAMLESS_PREVIEW_SCALE = 0.4;

export interface SeamlessFrameRequestOptions {
  previewScale?: number;
  /** When false, devices are drawn client-side in the preview (faster + live rotation) */
  includeDevices?: boolean;
  /** When false, panel text is drawn client-side in the preview */
  includeText?: boolean;
  /** Upload field names already sent this session (e.g. device_abc123). */
  cachedUploadFields?: ReadonlySet<string>;
  signal?: AbortSignal;
}

function appendIfNotCached(
  form: FormData,
  field: string,
  file: File,
  cached: ReadonlySet<string> | undefined,
): void {
  if (cached?.has(field)) return;
  form.append(field, file);
}

export async function frameSeamlessImage(
  settings: FrameSettings,
  devicePlacements: DevicePlacement[],
  stickers: Sticker[] = [],
  customFonts: CustomFont[] = [],
  options: SeamlessFrameRequestOptions = {},
): Promise<SeamlessFrameResult> {
  const { previewScale = 1, includeDevices = true, includeText = true, cachedUploadFields, signal } = options;
  const form = new FormData();
  form.append('device', settings.device);
  form.append('orientation', settings.orientation);
  form.append('panelCount', String(settings.panelCount));
  form.append('panels', JSON.stringify(settings.panels));
  form.append('options', JSON.stringify(settings.options));
  form.append('previewScale', String(previewScale));
  form.append('includeDevices', includeDevices ? '1' : '0');
  form.append('includeText', includeText ? '1' : '0');

  if (devicePlacements.length > 0) {
    const meta: DevicePlacementMeta[] = devicePlacements.map(({ id, x, y, width, rotation }) => ({
      id,
      x,
      y,
      width,
      rotation,
    }));
    form.append('devices', JSON.stringify(meta));
    for (const device of devicePlacements) {
      appendIfNotCached(form, `device_${device.id}`, device.file, cachedUploadFields);
    }
  }

  if (stickers.length > 0) {
    const meta: StickerMeta[] = stickers.map(({ id, x, y, width, layer }) => ({
      id,
      x,
      y,
      width,
      layer,
    }));
    form.append('stickers', JSON.stringify(meta));
    for (const sticker of stickers) {
      appendIfNotCached(form, `sticker_${sticker.id}`, sticker.file, cachedUploadFields);
    }
  }

  if (customFonts.length > 0) {
    const fontMeta: CustomFontMeta[] = customFonts.map(({ id, family }) => ({ id, family }));
    form.append('customFonts', JSON.stringify(fontMeta));
    for (const font of customFonts) {
      appendIfNotCached(form, `font_${font.id}`, font.file, cachedUploadFields);
    }
  }

  const res = await fetch('/api/seamless/frame', { method: 'POST', body: form, signal });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Failed to render seamless screenshots');
  }

  const data = (await res.json()) as { wide: string; panels: string[] };
  return {
    wide: base64ToBlob(data.wide),
    panels: data.panels.map((p) => base64ToBlob(p)),
  };
}

/** Remember uploads the server cached so later requests only send metadata. */
export function markSeamlessUploadsCached(
  cached: Set<string>,
  devicePlacements: DevicePlacement[],
  stickers: Sticker[],
  customFonts: CustomFont[],
): void {
  for (const d of devicePlacements) cached.add(`device_${d.id}`);
  for (const s of stickers) cached.add(`sticker_${s.id}`);
  for (const f of customFonts) cached.add(`font_${f.id}`);
}
