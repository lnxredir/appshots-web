import { resolveFontCss } from './custom-fonts';
import {
  panelEffectiveOptions,
  resolveTextAlignH,
  resolveTextPositionsFromOptions,
  type TextAlignH,
} from './panel-text-layout';
import type { CustomFont, FrameOptions, SeamlessPanelConfig } from '../types';

async function ensureFontsLoaded(styles: ReturnType<typeof canvasFont>[]): Promise<void> {
  if (!document.fonts) return;
  await Promise.all(
    styles.map((style) => {
      const weight = style.bold ? (style.isTitle ? 800 : 600) : style.isTitle ? 500 : 400;
      const fontStyle = style.italic ? 'italic' : 'normal';
      return document.fonts
        .load(`${fontStyle} ${weight} ${style.size}px ${style.font}`)
        .catch(() => undefined);
    }),
  );
}

function formatContent(text: string, uppercase?: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}

function canvasFont(
  role: 'title' | 'subtitle',
  opts: Partial<FrameOptions>,
  panelW: number,
  customFonts: CustomFont[],
): {
  font: string;
  size: number;
  color: string;
  lineHeight: number;
  letterSpacing: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  isTitle: boolean;
} {
  const isTitle = role === 'title';
  const sizeRatio = isTitle ? (opts.titleSize ?? 0.087) : (opts.subtitleSize ?? 0.043);
  const size = panelW * sizeRatio;
  const fontName = (isTitle ? opts.titleFont : opts.subtitleFont) ?? 'Inter';
  const bold = !!(isTitle ? opts.titleBold : opts.subtitleBold);
  const italic = !!(isTitle ? opts.titleItalic : opts.subtitleItalic);
  const spacingRatio = isTitle
    ? (opts.titleLetterSpacing ?? 0.08)
    : (opts.subtitleLetterSpacing ?? 0.01);

  return {
    font: resolveFontCss(fontName, customFonts),
    size,
    color: (isTitle ? opts.titleColor : opts.subtitleColor) ?? '#ffffff',
    lineHeight: isTitle ? 1.15 : 1.2,
    letterSpacing: size * spacingRatio,
    bold,
    italic,
    underline: !!(isTitle ? opts.titleUnderline : opts.subtitleUnderline),
    strikethrough: !!(isTitle ? opts.titleStrikethrough : opts.subtitleStrikethrough),
    isTitle,
  };
}

function applyTextStyle(
  ctx: CanvasRenderingContext2D,
  style: ReturnType<typeof canvasFont>,
): void {
  const weight = style.bold ? (style.isTitle ? 800 : 600) : style.isTitle ? 500 : 400;
  const fontStyle = style.italic ? 'italic' : 'normal';
  ctx.font = `${fontStyle} ${weight} ${style.size}px ${style.font}`;
  ctx.fillStyle = style.color;
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${style.letterSpacing}px`;
  }
}

function drawAlignedBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  anchorX: number,
  anchorY: number,
  panelW: number,
  panelH: number,
  offsetX: number,
  alignH: TextAlignH,
  style: ReturnType<typeof canvasFont>,
): void {
  if (lines.length === 0 || !lines[0]) return;

  applyTextStyle(ctx, style);
  const lineH = style.size * style.lineHeight;
  const totalH = lineH * lines.length;
  const x = offsetX + anchorX * panelW;
  const bottomY = anchorY * panelH;

  ctx.textAlign = alignH;
  ctx.textBaseline = 'alphabetic';

  let y = bottomY - totalH + style.size;
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
}

export async function drawPanelTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  panelW: number,
  panelH: number,
  offsetX: number,
  title: string | undefined,
  subtitle: string | undefined,
  options: Partial<FrameOptions>,
  customFonts: CustomFont[],
): Promise<void> {
  const titleStyle = canvasFont('title', options, panelW, customFonts);
  const subtitleStyle = canvasFont('subtitle', options, panelW, customFonts);
  const styles = [titleStyle];
  if (subtitle) styles.push(subtitleStyle);
  await ensureFontsLoaded(styles);

  const positions = resolveTextPositionsFromOptions(panelW, panelH, title, subtitle, options);

  if (title) {
    drawAlignedBlock(
      ctx,
      formatContent(title, options.titleUppercase).split('\n'),
      positions.titleX,
      positions.titleY,
      panelW,
      panelH,
      offsetX,
      resolveTextAlignH(options, positions.titleX),
      titleStyle,
    );
  }

  if (subtitle) {
    drawAlignedBlock(
      ctx,
      [formatContent(subtitle, options.subtitleUppercase)],
      positions.subtitleX,
      positions.subtitleY,
      panelW,
      panelH,
      offsetX,
      resolveTextAlignH(options, positions.subtitleX),
      subtitleStyle,
    );
  }
}

export async function drawSeamlessPanelTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  panelCount: number,
  panelW: number,
  panelH: number,
  panels: SeamlessPanelConfig[],
  globalOptions: Partial<FrameOptions>,
  customFonts: CustomFont[],
): Promise<void> {
  for (let i = 0; i < panelCount; i++) {
    const panel = panels[i];
    if (!panel?.title && !panel?.subtitle) continue;
    const opts = panelEffectiveOptions(globalOptions, panel);
    await drawPanelTextOnCanvas(
      ctx,
      panelW,
      panelH,
      i * panelW,
      panel.title,
      panel.subtitle,
      opts,
      customFonts,
    );
  }
}
