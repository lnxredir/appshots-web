import { formatFromFile } from './custom-fonts';
import type { CustomFont } from '../types';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styleToCss(style: Record<string, string | number>, maxWidth: number): string {
  const parts = [`max-width:${maxWidth}px`, 'box-sizing:border-box'];
  for (const [key, value] of Object.entries(style)) {
    const prop = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    parts.push(`${prop}:${value}`);
  }
  return parts.join(';');
}

function buildEmbeddedFontFaces(fonts: CustomFont[], dataUrls: Map<string, string>): string {
  return fonts
    .map(
      (font) => `@font-face {
  font-family: '${font.family.replace(/'/g, '')}';
  src: url('${dataUrls.get(font.id) ?? font.url}') format('${formatFromFile(font.file)}');
  font-weight: 100 900;
  font-style: normal;
}`,
    )
    .join('\n');
}

const fontDataUrlCache = new Map<string, string>();

async function resolveFontDataUrls(fonts: CustomFont[]): Promise<Map<string, string>> {
  const dataUrls = new Map<string, string>();
  await Promise.all(
    fonts.map(async (font) => {
      const cached = fontDataUrlCache.get(font.id);
      if (cached) {
        dataUrls.set(font.id, cached);
        return;
      }

      const res = await fetch(font.url);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const dataUrl = `data:font/${formatFromFile(font.file)};base64,${btoa(binary)}`;
      fontDataUrlCache.set(font.id, dataUrl);
      dataUrls.set(font.id, dataUrl);
    }),
  );
  return dataUrls;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to rasterize text'));
    img.src = src;
  });
}

async function rasterizeSvg(svg: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rasterize text with the same CSS layout the live preview uses (wrapping, letter-spacing, custom fonts). */
export async function rasterizeTextBlock(
  content: string,
  style: Record<string, string | number>,
  maxWidth: number,
  customFonts: CustomFont[],
): Promise<HTMLCanvasElement | null> {
  if (!content.trim()) return null;

  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;';
  Object.assign(probe.style, style as Partial<CSSStyleDeclaration>);
  probe.style.maxWidth = `${maxWidth}px`;
  probe.style.boxSizing = 'border-box';
  probe.textContent = content;
  document.body.appendChild(probe);

  if (document.fonts) {
    await document.fonts.ready;
  }

  const rect = probe.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  document.body.removeChild(probe);

  const fontDataUrls = await resolveFontDataUrls(customFonts);
  const css = styleToCss(style, maxWidth);
  const fontFaces = buildEmbeddedFontFaces(customFonts, fontDataUrls);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <style type="text/css"><![CDATA[
${fontFaces}
    ]]></style>
  </defs>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="${css}">${escapeXml(content)}</div>
  </foreignObject>
</svg>`;

  return rasterizeSvg(svg, width, height);
}
