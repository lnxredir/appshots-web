import type { FrameOptions, SeamlessPanelConfig } from '../types';

export interface PanelTextPositions {
  titleX: number;
  titleY: number;
  subtitleX: number;
  subtitleY: number;
}

export function panelEffectiveOptions(
  globalOptions: Partial<FrameOptions>,
  panel: SeamlessPanelConfig,
): Partial<FrameOptions> {
  return { ...globalOptions, ...panel.style };
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

export function computeDefaultTextPositions(
  panelW: number,
  panelH: number,
  title: string | undefined,
  subtitle: string | undefined,
  opts: Partial<FrameOptions>,
): PanelTextPositions {
  const titleSize = opts.titleSize ?? 0.087;
  const subtitleSize = opts.subtitleSize ?? 0.043;
  const titleFontSize = panelW * titleSize;
  const subtitleFontSize = panelW * subtitleSize;
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

export function resolveTextPositionsFromOptions(
  panelW: number,
  panelH: number,
  title: string | undefined,
  subtitle: string | undefined,
  opts: Partial<FrameOptions>,
): PanelTextPositions {
  const defaults = computeDefaultTextPositions(panelW, panelH, title, subtitle, opts);
  return {
    titleX: opts.titleX ?? defaults.titleX,
    titleY: opts.titleY ?? defaults.titleY,
    subtitleX: opts.subtitleX ?? defaults.subtitleX,
    subtitleY: opts.subtitleY ?? defaults.subtitleY,
  };
}

export type TextAlignH = 'left' | 'center' | 'right';
export type TextAlignV = 'top' | 'middle' | 'bottom';

const TEXT_ALIGN_MARGIN = 0.08;

export function applyTextAlign(
  positions: PanelTextPositions,
  alignH: TextAlignH | null,
  alignV: TextAlignV | null,
  title: string | undefined,
  subtitle: string | undefined,
  panelW: number,
  panelH: number,
  opts: Partial<FrameOptions>,
): PanelTextPositions {
  let { titleX, titleY, subtitleX, subtitleY } = positions;
  const margin = TEXT_ALIGN_MARGIN;

  if (alignH === 'left') {
    titleX = margin;
    subtitleX = margin;
  } else if (alignH === 'center') {
    titleX = 0.5;
    subtitleX = 0.5;
  } else if (alignH === 'right') {
    titleX = 1 - margin;
    subtitleX = 1 - margin;
  }

  if (alignV === 'top') {
    const topDefaults = computeDefaultTextPositions(panelW, panelH, title, subtitle, {
      ...opts,
      textPosition: 'top',
    });
    if (title) titleY = topDefaults.titleY;
    if (subtitle) subtitleY = topDefaults.subtitleY;
  } else if (alignV === 'bottom') {
    const bottomDefaults = computeDefaultTextPositions(panelW, panelH, title, subtitle, {
      ...opts,
      textPosition: 'bottom',
    });
    if (title) titleY = bottomDefaults.titleY;
    if (subtitle) subtitleY = bottomDefaults.subtitleY;
  } else if (alignV === 'middle') {
    const ys: number[] = [];
    if (title) ys.push(titleY);
    if (subtitle) ys.push(subtitleY);
    if (ys.length > 0) {
      const center = ys.reduce((sum, y) => sum + y, 0) / ys.length;
      const delta = 0.5 - center;
      if (title) titleY += delta;
      if (subtitle) subtitleY += delta;
    }
  }

  return { titleX, titleY, subtitleX, subtitleY };
}

export function resolveTextPositions(
  panelW: number,
  panelH: number,
  panel: SeamlessPanelConfig,
  globalOptions: Partial<FrameOptions>,
): PanelTextPositions {
  const opts = panelEffectiveOptions(globalOptions, panel);
  const defaults = computeDefaultTextPositions(panelW, panelH, panel.title, panel.subtitle, opts);
  return {
    titleX: opts.titleX ?? defaults.titleX,
    titleY: opts.titleY ?? defaults.titleY,
    subtitleX: opts.subtitleX ?? defaults.subtitleX,
    subtitleY: opts.subtitleY ?? defaults.subtitleY,
  };
}

export function textElementId(panelIndex: number, role: 'title' | 'subtitle'): string {
  return `panel-${panelIndex}-${role}`;
}

export function parseTextElementId(id: string): { panelIndex: number; role: 'title' | 'subtitle' } | null {
  const match = id.match(/^panel-(\d+)-(title|subtitle)$/);
  if (!match) return null;
  return { panelIndex: parseInt(match[1], 10), role: match[2] as 'title' | 'subtitle' };
}

/** Wide-canvas normalized X for a text anchor centered in a panel slice. */
export function wideNormalizedX(panelIndex: number, localX: number, panelCount: number): number {
  return (panelIndex + localX) / panelCount;
}

export function localXFromWide(wideX: number, panelIndex: number, panelCount: number): number {
  return wideX * panelCount - panelIndex;
}
