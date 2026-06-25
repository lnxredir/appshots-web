import { resolveFontCss } from './custom-fonts';
import type { TextAlignH } from './panel-text-layout';
import type { CustomFont, FrameOptions } from '../types';

export function formatPanelTextContent(text: string, uppercase?: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}

/** CSS for a title/subtitle block — shared by live preview and export rasterization. */
export function buildPanelTextBlockStyle(
  role: 'title' | 'subtitle',
  opts: Partial<FrameOptions>,
  customFonts: CustomFont[],
  fontSize: number,
  alignH: TextAlignH,
): Record<string, string | number> {
  const isTitle = role === 'title';
  const font = (isTitle ? opts.titleFont : opts.subtitleFont) ?? 'Inter';
  const color = (isTitle ? opts.titleColor : opts.subtitleColor) ?? '#ffffff';
  const bold = isTitle ? opts.titleBold : opts.subtitleBold;
  const italic = isTitle ? opts.titleItalic : opts.subtitleItalic;
  const underline = isTitle ? opts.titleUnderline : opts.subtitleUnderline;
  const strikethrough = isTitle ? opts.titleStrikethrough : opts.subtitleStrikethrough;
  const uppercase = isTitle ? opts.titleUppercase : opts.subtitleUppercase;
  const shadow = isTitle ? opts.titleShadow : opts.subtitleShadow;
  const spacingRatio = isTitle
    ? (opts.titleLetterSpacing ?? 0.08)
    : (opts.subtitleLetterSpacing ?? 0.01);

  const decorations: string[] = [];
  if (underline) decorations.push('underline');
  if (strikethrough) decorations.push('line-through');

  return {
    fontFamily: resolveFontCss(font, customFonts),
    fontSize: `${fontSize}px`,
    fontWeight: bold ? (isTitle ? 800 : 600) : isTitle ? 500 : 400,
    fontStyle: italic ? 'italic' : 'normal',
    color,
    letterSpacing: `${fontSize * spacingRatio}px`,
    textTransform: uppercase ? 'uppercase' : 'none',
    textDecoration: decorations.length ? decorations.join(' ') : 'none',
    textShadow: shadow ? '0 3px 10px rgba(0,0,0,0.5)' : 'none',
    lineHeight: isTitle ? 1.15 : 1.2,
    whiteSpace: 'pre-line',
    textAlign: alignH,
    margin: 0,
    padding: 0,
  };
}

export const DEFAULT_TEXT_BOX_WIDTH = 0.84;

export function resolveTextBoxWidth(
  role: 'title' | 'subtitle',
  opts: Partial<FrameOptions>,
): number {
  const value = role === 'title' ? opts.titleBoxWidth : opts.subtitleBoxWidth;
  return value ?? DEFAULT_TEXT_BOX_WIDTH;
}

export function panelTextMaxWidth(panelW: number, boxWidthFraction?: number): number {
  return panelW * (boxWidthFraction ?? DEFAULT_TEXT_BOX_WIDTH);
}
