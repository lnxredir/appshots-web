import { rasterizeTextBlock } from './dom-text-raster';
import {
  buildPanelTextBlockStyle,
  formatPanelTextContent,
  panelTextMaxWidth,
  resolveTextBoxWidth,
} from './panel-text-styles';
import {
  panelEffectiveOptions,
  resolveTextAlignH,
  resolveTextPositionsFromOptions,
  type TextAlignH,
} from './panel-text-layout';
import type { CustomFont, FrameOptions, SeamlessPanelConfig } from '../types';

function drawRasterizedBlock(
  ctx: CanvasRenderingContext2D,
  block: HTMLCanvasElement,
  anchorX: number,
  anchorY: number,
  panelW: number,
  panelH: number,
  offsetX: number,
  alignH: TextAlignH,
): void {
  const w = block.width;
  const h = block.height;
  const anchorPxX = offsetX + anchorX * panelW;
  const anchorPxY = anchorY * panelH;

  let x = anchorPxX;
  if (alignH === 'center') x -= w / 2;
  else if (alignH === 'right') x -= w;

  ctx.drawImage(block, x, anchorPxY - h);
}

async function drawTextRole(
  ctx: CanvasRenderingContext2D,
  role: 'title' | 'subtitle',
  content: string | undefined,
  anchorX: number,
  anchorY: number,
  panelW: number,
  panelH: number,
  offsetX: number,
  options: Partial<FrameOptions>,
  customFonts: CustomFont[],
): Promise<void> {
  if (!content) return;

  const isTitle = role === 'title';
  const fontSize = panelW * (isTitle ? (options.titleSize ?? 0.087) : (options.subtitleSize ?? 0.043));
  const alignH = resolveTextAlignH(options, anchorX);
  const formatted = formatPanelTextContent(
    content,
    isTitle ? options.titleUppercase : options.subtitleUppercase,
  );
  const style = buildPanelTextBlockStyle(role, options, customFonts, fontSize, alignH);
  const block = await rasterizeTextBlock(
    formatted,
    style,
    panelTextMaxWidth(panelW, resolveTextBoxWidth(role, options)),
    customFonts,
  );
  if (!block) return;

  drawRasterizedBlock(ctx, block, anchorX, anchorY, panelW, panelH, offsetX, alignH);
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
  const positions = resolveTextPositionsFromOptions(panelW, panelH, title, subtitle, options);

  await drawTextRole(
    ctx,
    'title',
    title,
    positions.titleX,
    positions.titleY,
    panelW,
    panelH,
    offsetX,
    options,
    customFonts,
  );

  await drawTextRole(
    ctx,
    'subtitle',
    subtitle,
    positions.subtitleX,
    positions.subtitleY,
    panelW,
    panelH,
    offsetX,
    options,
    customFonts,
  );
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
