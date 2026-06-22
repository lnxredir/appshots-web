import type { CustomFont, FrameOptions } from '../types.js';
import {
  buildFontFaces,
  buildTextAttrs,
  buildTextFilters,
  formatTextContent,
} from './text-styles.js';
import {
  computeDefaultTextPositions,
  resolveTextPositions,
  usesFreeTextLayout,
} from './panel-text-layout.js';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderMultilineText(
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  attrs: string,
): string {
  if (lines.length === 1) {
    return `<text x="${x}" y="${y}" ${attrs}>${escapeXml(lines[0])}</text>`;
  }
  const dy = Math.round(fontSize * lineHeight);
  let svg = `<text ${attrs}>`;
  for (let i = 0; i < lines.length; i++) {
    svg += `<tspan x="${x}" ${i === 0 ? `y="${y}"` : `dy="${dy}"`}>${escapeXml(lines[i])}</tspan>`;
  }
  svg += '</text>';
  return svg;
}

export async function buildPanelTextSvg(
  panelW: number,
  panelH: number,
  title: string | undefined,
  subtitle: string | undefined,
  opts: FrameOptions,
  customFonts: CustomFont[],
): Promise<string> {
  const titleFontSize = Math.round(panelW * opts.titleSize);
  const subtitleFontSize = Math.round(panelW * opts.subtitleSize);
  const titleAttrs = buildTextAttrs('title', opts, titleFontSize, customFonts);
  const subtitleAttrs = buildTextAttrs('subtitle', opts, subtitleFontSize, customFonts);

  const fontFaces = await buildFontFaces([opts.titleFont, opts.subtitleFont], customFonts);
  const filters = buildTextFilters(opts);

  let textElements = '';

  if (usesFreeTextLayout(opts)) {
    const positions = resolveTextPositions(panelW, panelH, title, subtitle, opts);
    const titleX = Math.round(panelW * positions.titleX);
    const titleY = Math.round(panelH * positions.titleY);
    const subtitleX = Math.round(panelW * positions.subtitleX);
    const subtitleY = Math.round(panelH * positions.subtitleY);

    if (title) {
      const lines = formatTextContent(title, opts.titleUppercase).split('\n');
      textElements += renderMultilineText(lines, titleX, titleY, titleFontSize, 1.15, titleAttrs);
    }

    if (subtitle) {
      const text = formatTextContent(subtitle, opts.subtitleUppercase);
      textElements += `<text x="${subtitleX}" y="${subtitleY}" ${subtitleAttrs}>${escapeXml(text)}</text>`;
    }
  } else if (opts.textPosition === 'top') {
    const cx = Math.round(panelW / 2);
    const topPad = Math.round(panelH * 0.072);
    let y = topPad;

    if (title) {
      const lines = formatTextContent(title, opts.titleUppercase).split('\n');
      y += Math.round(titleFontSize * 1.15);
      textElements += renderMultilineText(lines, cx, y, titleFontSize, 1.15, titleAttrs);
    }

    if (subtitle) {
      y += Math.round(titleFontSize * 0.4) + subtitleFontSize;
      const text = formatTextContent(subtitle, opts.subtitleUppercase);
      textElements += `<text x="${cx}" y="${y}" ${subtitleAttrs}>${escapeXml(text)}</text>`;
    }
  } else {
    const cx = Math.round(panelW / 2);
    const bottomPad = Math.round(panelH * 0.086);
    let y = panelH - bottomPad;

    if (subtitle) {
      const text = formatTextContent(subtitle, opts.subtitleUppercase);
      textElements += `<text x="${cx}" y="${y}" ${subtitleAttrs}>${escapeXml(text)}</text>`;
      y -= Math.round(subtitleFontSize * 1.8);
    }

    if (title) {
      const lines = formatTextContent(title!, opts.titleUppercase).split('\n');
      const lineH = Math.round(titleFontSize * 1.15);
      const firstLineY = y - (lines.length - 1) * lineH;
      textElements += renderMultilineText(lines, cx, firstLineY, titleFontSize, 1.15, titleAttrs);
    }
  }

  const styleBlock = fontFaces ? `<style>${fontFaces}</style>` : '';

  return `<svg width="${panelW}" height="${panelH}" xmlns="http://www.w3.org/2000/svg">
    <defs>${styleBlock}${filters}</defs>
    ${textElements}
  </svg>`;
}

export { computeDefaultTextPositions, resolveTextPositions, usesFreeTextLayout };
