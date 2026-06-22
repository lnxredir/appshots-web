import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameScreenshot, frameSeamless, listDevices } from 'appshots';
import type { FrameOptions, StickerPlacement, CustomFont, SeamlessDevicePlacement } from 'appshots';

const app = new Hono();
const isProduction = process.env.NODE_ENV === 'production';
const staticRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const hasStaticUi = isProduction && existsSync(staticRoot);

interface StickerMeta {
  id: string;
  x: number;
  y: number;
  width: number;
  layer: 'background' | 'behind-text' | 'foreground';
}

interface CustomFontMeta {
  id: string;
  family: string;
}

interface DevicePlacementMeta {
  id: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
}

function isUpload(value: FormDataEntryValue | null): value is Blob {
  return (
    value !== null &&
    typeof value === 'object' &&
    'arrayBuffer' in value &&
    typeof value.arrayBuffer === 'function'
  );
}

async function readUpload(value: FormDataEntryValue | null): Promise<Buffer | null> {
  if (!isUpload(value)) return null;
  return Buffer.from(await value.arrayBuffer());
}

/** Re-use uploaded blobs when the client only sends placement/style updates. */
const uploadCache = new Map<string, Buffer>();

async function readCachedUpload(form: FormData, field: string): Promise<Buffer | null> {
  const fresh = await readUpload(form.get(field));
  if (fresh) {
    uploadCache.set(field, fresh);
    return fresh;
  }
  return uploadCache.get(field) ?? null;
}

app.use('/*', cors());

app.get('/api/devices', (c) => {
  return c.json(listDevices());
});

app.post('/api/frame', async (c) => {
  try {
    const form = await c.req.formData();
    const image = form.get('image');
    const imageBuffer = await readUpload(image);
    if (!imageBuffer) {
      return c.json({ error: 'Missing image file' }, 400);
    }

    const device = String(form.get('device') ?? 'iphone-6.9');
    const title = form.get('title') ? String(form.get('title')) : undefined;
    const subtitle = form.get('subtitle') ? String(form.get('subtitle')) : undefined;
    const orientation = form.get('orientation') === 'landscape' ? 'landscape' : 'portrait';
    const includeDevice = form.get('includeDevice') !== '0';
    const includeText = form.get('includeText') !== '0';

    const optionsJson = form.get('options');
    let options: Partial<FrameOptions> = {};
    if (typeof optionsJson === 'string' && optionsJson) {
      options = JSON.parse(optionsJson) as Partial<FrameOptions>;
    }

    const buffer = imageBuffer;

    const stickersJson = form.get('stickers');
    let stickers: StickerPlacement[] = [];
    if (typeof stickersJson === 'string' && stickersJson) {
      const meta = JSON.parse(stickersJson) as StickerMeta[];
      stickers = await Promise.all(
        meta.map(async (s) => {
          const stickerBuffer = await readCachedUpload(form, `sticker_${s.id}`);
          if (!stickerBuffer) {
            throw new Error(`Missing sticker image: ${s.id}`);
          }
          return {
            image: stickerBuffer,
            x: s.x,
            y: s.y,
            width: s.width,
            layer: s.layer,
          };
        }),
      );
    }

    const fontsJson = form.get('customFonts');
    let customFonts: CustomFont[] = [];
    if (typeof fontsJson === 'string' && fontsJson) {
      const meta = JSON.parse(fontsJson) as CustomFontMeta[];
      customFonts = await Promise.all(
        meta.map(async (f) => {
          const fontBuffer = await readCachedUpload(form, `font_${f.id}`);
          if (!fontBuffer) {
            throw new Error(`Missing font file: ${f.id}`);
          }
          return {
            id: f.id,
            family: f.family,
            data: fontBuffer,
          };
        }),
      );
    }

    const result = await frameScreenshot({
      input: buffer,
      device,
      title,
      subtitle,
      orientation,
      options,
      stickers,
      customFonts,
      includeDevice,
      includeText,
    });

    return new Response(new Uint8Array(result), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to frame screenshot';
    return c.json({ error: message }, 500);
  }
});

app.post('/api/seamless/frame', async (c) => {
  try {
    const form = await c.req.formData();
    const device = String(form.get('device') ?? 'iphone-6.9');
    const orientation = form.get('orientation') === 'landscape' ? 'landscape' : 'portrait';
    const panelCount = Math.min(5, Math.max(2, parseInt(String(form.get('panelCount') ?? '3'), 10)));
    const previewScale = Math.min(1, Math.max(0.1, parseFloat(String(form.get('previewScale') ?? '1'))));
    const includeDevices = form.get('includeDevices') !== '0';
    const includeText = form.get('includeText') !== '0';

    const optionsJson = form.get('options');
    let options: Partial<FrameOptions> = {};
    if (typeof optionsJson === 'string' && optionsJson) {
      options = JSON.parse(optionsJson) as Partial<FrameOptions>;
    }

    const panelsJson = form.get('panels');
    const panels = typeof panelsJson === 'string' && panelsJson
      ? JSON.parse(panelsJson) as { title?: string; subtitle?: string }[]
      : [];

    const devicesJson = form.get('devices');
    let devicePlacements: SeamlessDevicePlacement[] = [];
    if (typeof devicesJson === 'string' && devicesJson) {
      const meta = JSON.parse(devicesJson) as DevicePlacementMeta[];
      devicePlacements = await Promise.all(
        meta.map(async (d) => {
          const deviceBuffer = await readCachedUpload(form, `device_${d.id}`);
          if (!deviceBuffer) {
            throw new Error(`Missing device screenshot: ${d.id}`);
          }
          return {
            id: d.id,
            image: deviceBuffer,
            x: d.x,
            y: d.y,
            width: d.width,
            rotation: Number(d.rotation) || 0,
          };
        }),
      );
    }

    const stickersJson = form.get('stickers');
    let stickers: StickerPlacement[] = [];
    if (typeof stickersJson === 'string' && stickersJson) {
      const meta = JSON.parse(stickersJson) as StickerMeta[];
      stickers = await Promise.all(
        meta.map(async (s) => {
          const stickerBuffer = await readCachedUpload(form, `sticker_${s.id}`);
          if (!stickerBuffer) {
            throw new Error(`Missing sticker image: ${s.id}`);
          }
          return {
            image: stickerBuffer,
            x: s.x,
            y: s.y,
            width: s.width,
            layer: s.layer,
          };
        }),
      );
    }

    const fontsJson = form.get('customFonts');
    let customFonts: CustomFont[] = [];
    if (typeof fontsJson === 'string' && fontsJson) {
      const meta = JSON.parse(fontsJson) as CustomFontMeta[];
      customFonts = await Promise.all(
        meta.map(async (f) => {
          const fontBuffer = await readCachedUpload(form, `font_${f.id}`);
          if (!fontBuffer) {
            throw new Error(`Missing font file: ${f.id}`);
          }
          return {
            id: f.id,
            family: f.family,
            data: fontBuffer,
          };
        }),
      );
    }

    const result = await frameSeamless({
      device,
      panelCount,
      panels,
      options,
      devices: devicePlacements,
      stickers,
      customFonts,
      orientation,
      previewScale,
      includeDevices,
      includeText,
    });

    return c.json({
      wide: result.wide.toString('base64'),
      panels: result.panels.map((p) => p.toString('base64')),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to frame seamless screenshots';
    return c.json({ error: message }, 500);
  }
});

if (hasStaticUi) {
  app.use('*', serveStatic({ root: staticRoot }));
  app.get('*', serveStatic({ path: 'index.html', root: staticRoot }));
}

const port = Number.parseInt(process.env.PORT ?? '3847', 10);
const host = process.env.HOST ?? '0.0.0.0';
console.log(`appshots → http://${host}:${port}`);
serve({ fetch: app.fetch, port, hostname: host });
