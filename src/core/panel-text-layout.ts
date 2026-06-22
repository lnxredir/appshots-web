import type { FrameOptions } from '../types.js';

export interface PanelTextPositions {
  titleX: number;
  titleY: number;
  subtitleX: number;
  subtitleY: number;
}

export function usesFreeTextLayout(opts: Partial<FrameOptions>): boolean {
  return !!(
    opts.freePosition ||
    opts.titleX != null ||
    opts.titleY != null ||
    opts.subtitleX != null ||
    opts.subtitleY != null
  );
}

/** Default anchor positions matching preset top/bottom layout (ratios within panel). */
export function computeDefaultTextPositions(
  panelW: number,
  panelH: number,
  title: string | undefined,
  subtitle: string | undefined,
  opts: FrameOptions,
): PanelTextPositions {
  const titleFontSize = panelW * opts.titleSize;
  const subtitleFontSize = panelW * opts.subtitleSize;
  const textPosition = opts.textPosition ?? 'bottom';
  const cx = 0.5;

  if (textPosition === 'top') {
    const topPad = panelH * 0.072;
    let y = topPad;
    let titleY = 0;
    let subtitleY = 0;

    if (title) {
      y += titleFontSize * 1.15;
      titleY = y / panelH;
    }

    if (subtitle) {
      y += titleFontSize * 0.4 + subtitleFontSize;
      subtitleY = y / panelH;
    }

    return { titleX: cx, titleY, subtitleX: cx, subtitleY };
  }

  const bottomPad = panelH * 0.086;
  let y = panelH - bottomPad;
  let subtitleY = 0;
  let titleY = 0;

  if (subtitle) {
    subtitleY = y / panelH;
    y -= subtitleFontSize * 1.8;
  }

  if (title) {
    const lines = (title ?? '').split('\n');
    const lineH = titleFontSize * 1.15;
    const firstLineY = y - (lines.length - 1) * lineH;
    titleY = firstLineY / panelH;
  }

  return { titleX: cx, titleY, subtitleX: cx, subtitleY };
}

export function resolveTextPositions(
  panelW: number,
  panelH: number,
  title: string | undefined,
  subtitle: string | undefined,
  opts: FrameOptions,
): PanelTextPositions {
  const defaults = computeDefaultTextPositions(panelW, panelH, title, subtitle, opts);
  return {
    titleX: opts.titleX ?? defaults.titleX,
    titleY: opts.titleY ?? defaults.titleY,
    subtitleX: opts.subtitleX ?? defaults.subtitleX,
    subtitleY: opts.subtitleY ?? defaults.subtitleY,
  };
}
