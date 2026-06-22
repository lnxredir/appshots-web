import type { CustomFont } from '../types';

const FONT_EXT = /\.(woff2?|ttf|otf)$/i;

export function isFontFile(file: File): boolean {
  return FONT_EXT.test(file.name) || /font|octet-stream/.test(file.type);
}

export function familyFromFilename(filename: string): string {
  const base = filename.replace(FONT_EXT, '').replace(/[-_]+/g, ' ').trim();
  return base || 'Custom Font';
}

export function formatFromFile(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.woff2')) return 'woff2';
  if (name.endsWith('.woff')) return 'woff';
  if (name.endsWith('.otf')) return 'opentype';
  return 'truetype';
}

export function customFontRef(id: string): string {
  return `custom:${id}`;
}

export function injectCustomFonts(fonts: CustomFont[]): () => void {
  const styleId = 'appshots-custom-fonts';
  let el = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }

  el.textContent = fonts
    .map(
      (font) => `@font-face {
  font-family: '${font.family.replace(/'/g, '')}';
  src: url('${font.url}') format('${formatFromFile(font.file)}');
  font-weight: 100 900;
  font-style: normal;
}`,
    )
    .join('\n');

  return () => {
    el?.remove();
  };
}

export function resolveFontCss(font: string, customFonts: CustomFont[]): string {
  if (font === 'System UI') return 'system-ui, sans-serif';
  if (font.startsWith('custom:')) {
    const id = font.slice(7);
    const match = customFonts.find((f) => f.id === id);
    return match ? `'${match.family}', sans-serif` : 'sans-serif';
  }
  return `'${font}', sans-serif`;
}
