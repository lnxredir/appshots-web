import type { CustomFont, FrameOptions } from '../types.js';

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

export type FontFamily = (typeof FONT_FAMILIES)[number];

const fontFaceCache = new Map<string, string>();
const customFontCache = new Map<string, string>();

const SYSTEM_FONT_STACK = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

export function isCustomFontRef(font: string): boolean {
  return font.startsWith('custom:');
}

export function customFontId(font: string): string {
  return font.slice('custom:'.length);
}

function detectFontFormat(buffer: Buffer): { mime: string; format: string } {
  const sig = buffer.subarray(0, 4).toString('ascii');
  if (sig === 'wOF2') return { mime: 'font/woff2', format: 'woff2' };
  if (sig === 'wOFF') return { mime: 'font/woff', format: 'woff' };
  if (buffer[0] === 0x4f && buffer[1] === 0x54 && buffer[2] === 0x54 && buffer[3] === 0x4f) {
    return { mime: 'font/otf', format: 'opentype' };
  }
  return { mime: 'font/ttf', format: 'truetype' };
}

function embedCustomFont(family: string, buffer: Buffer): string {
  const { mime, format } = detectFontFormat(buffer);
  const b64 = buffer.toString('base64');
  const safeFamily = family.replace(/'/g, '');
  return `@font-face {
    font-family: '${safeFamily}';
    src: url(data:${mime};base64,${b64}) format('${format}');
    font-weight: 100 900;
    font-style: normal;
  }`;
}

export async function buildFontFaces(
  fonts: string[],
  customFonts: CustomFont[] = [],
): Promise<string> {
  const faces: string[] = [];

  for (const font of [...new Set(fonts.filter(Boolean))]) {
    if (font === 'System UI') continue;

    if (isCustomFontRef(font)) {
      const id = customFontId(font);
      const cacheKey = `custom:${id}`;
      if (customFontCache.has(cacheKey)) {
        faces.push(customFontCache.get(cacheKey)!);
        continue;
      }
      const custom = customFonts.find((f) => f.id === id);
      if (custom) {
        const embedded = embedCustomFont(custom.family, custom.data);
        customFontCache.set(cacheKey, embedded);
        faces.push(embedded);
      }
      continue;
    }

    if (FONT_FAMILIES.includes(font as FontFamily)) {
      const google = await fetchFontFace(font);
      if (google) faces.push(google);
    }
  }

  return faces.join('\n');
}

async function fetchFontFace(family: string): Promise<string> {
  if (fontFaceCache.has(family)) return fontFaceCache.get(family)!;

  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap`;
    const css = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }).then((r) => r.text());

    const blocks: string[] = [];
    const faceRegex = /@font-face\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;

    while ((match = faceRegex.exec(css)) !== null) {
      let block = match[1];
      const urlMatch = block.match(/url\((https:[^)]+)\)/);
      if (urlMatch) {
        const fontData = await fetch(urlMatch[1]).then((r) => r.arrayBuffer());
        const b64 = Buffer.from(fontData).toString('base64');
        const format = urlMatch[1].includes('.woff2') ? 'woff2' : 'woff';
        block = block.replace(/url\([^)]+\)/, `url(data:font/${format};base64,${b64})`);
      }
      blocks.push(`@font-face { ${block} }`);
    }

    const result = blocks.join('\n');
    fontFaceCache.set(family, result);
    return result;
  } catch {
    return '';
  }
}

export function resolveFontFamily(font: string, customFonts: CustomFont[] = []): string {
  if (font === 'System UI') return SYSTEM_FONT_STACK;

  if (isCustomFontRef(font)) {
    const custom = customFonts.find((f) => f.id === customFontId(font));
    if (custom) return `'${custom.family.replace(/'/g, '')}', ${SYSTEM_FONT_STACK}`;
    return SYSTEM_FONT_STACK;
  }

  return `'${font.replace(/'/g, '')}', ${SYSTEM_FONT_STACK}`;
}

function buildDecorations(underline: boolean, strikethrough: boolean): string | null {
  const parts: string[] = [];
  if (underline) parts.push('underline');
  if (strikethrough) parts.push('line-through');
  return parts.length ? parts.join(' ') : null;
}

export function buildTextFilters(opts: FrameOptions): string {
  let defs = '';

  if (opts.titleShadow) {
    defs += `<filter id="title-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000000" flood-opacity="0.5"/>
    </filter>`;
  }

  if (opts.subtitleShadow) {
    defs += `<filter id="subtitle-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.4"/>
    </filter>`;
  }

  return defs;
}

export function buildTextAttrs(
  role: 'title' | 'subtitle',
  opts: FrameOptions,
  fontSize: number,
  customFonts: CustomFont[] = [],
  textAlignH: 'left' | 'center' | 'right' = 'center',
): string {
  const isTitle = role === 'title';
  const font = isTitle ? opts.titleFont : opts.subtitleFont;
  const color = isTitle ? opts.titleColor : opts.subtitleColor;
  const bold = isTitle ? opts.titleBold : opts.subtitleBold;
  const italic = isTitle ? opts.titleItalic : opts.subtitleItalic;
  const underline = isTitle ? opts.titleUnderline : opts.subtitleUnderline;
  const strikethrough = isTitle ? opts.titleStrikethrough : opts.subtitleStrikethrough;
  const uppercase = isTitle ? opts.titleUppercase : opts.subtitleUppercase;
  const shadow = isTitle ? opts.titleShadow : opts.subtitleShadow;

  const weight = bold ? (isTitle ? 800 : 600) : isTitle ? 500 : 400;
  const spacingRatio = isTitle
    ? (opts.titleLetterSpacing ?? 0.08)
    : (opts.subtitleLetterSpacing ?? 0.01);
  const letterSpacing = Math.round(fontSize * spacingRatio);

  const anchor =
    textAlignH === 'left' ? 'start' : textAlignH === 'right' ? 'end' : 'middle';

  const parts = [
    `text-anchor="${anchor}"`,
    `font-size="${fontSize}"`,
    `font-weight="${weight}"`,
    `fill="${color}"`,
    `font-family="${resolveFontFamily(font, customFonts)}"`,
    `letter-spacing="${letterSpacing}"`,
  ];

  if (italic) parts.push('font-style="italic"');

  const decoration = buildDecorations(underline, strikethrough);
  if (decoration) parts.push(`text-decoration="${decoration}"`);

  if (uppercase) parts.push('text-transform="uppercase"');

  if (shadow) parts.push(`filter="url(#${role}-shadow)"`);

  return parts.join(' ');
}

export function formatTextContent(text: string, uppercase: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}

export function fontCssFamily(font: string, customFonts: CustomFont[] = []): string {
  if (font === 'System UI') return 'system-ui, sans-serif';
  if (isCustomFontRef(font)) {
    const custom = customFonts.find((f) => f.id === customFontId(font));
    return custom ? `'${custom.family}', sans-serif` : 'sans-serif';
  }
  return `'${font}', sans-serif`;
}
