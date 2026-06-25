import {
  buildPanelTextBlockStyle,
  formatPanelTextContent,
  resolveTextBoxWidth,
} from '../lib/panel-text-styles';
import {
  panelEffectiveOptions,
  resolveTextAlignH,
  resolveTextPositions,
  textAnchorTransform,
  textElementId,
} from '../lib/panel-text-layout';
import type { CustomFont, FrameOptions, SeamlessPanelConfig } from '../types';

interface LivePanelTextProps {
  panelIndex: number;
  panel: SeamlessPanelConfig;
  globalOptions: Partial<FrameOptions>;
  customFonts: CustomFont[];
  panelWidth: number;
  panelHeight: number;
  panelCount: number;
  wideW: number;
  imageRect: { x: number; y: number; width: number; height: number };
  freePosition: boolean;
  alwaysInteractive?: boolean;
  selectedId: string | null;
  draggingId: string | null;
  resizingId?: string | null;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
  onResizePointerDown?: (e: React.PointerEvent, id: string, currentWidth: number) => void;
}

function textStyle(
  role: 'title' | 'subtitle',
  opts: Partial<FrameOptions>,
  customFonts: CustomFont[],
  fontSize: number,
  alignH: 'left' | 'center' | 'right',
): React.CSSProperties {
  return buildPanelTextBlockStyle(role, opts, customFonts, fontSize, alignH);
}

function TextBlock({
  id,
  role,
  content,
  anchorX,
  anchorY,
  panelIndex,
  panelWidth,
  panelHeight,
  wideW,
  imageRect,
  style,
  alignH,
  boxWidth,
  interactive,
  selected,
  isDragging,
  isResizing,
  onPointerDown,
  onClick,
  onResizePointerDown,
}: {
  id: string;
  role: 'title' | 'subtitle';
  content: string;
  anchorX: number;
  anchorY: number;
  panelIndex: number;
  panelWidth: number;
  panelHeight: number;
  wideW: number;
  imageRect: { width: number; height: number };
  style: React.CSSProperties;
  alignH: 'left' | 'center' | 'right';
  boxWidth: number;
  interactive: boolean;
  selected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
  onResizePointerDown?: (e: React.PointerEvent, id: string, currentWidth: number) => void;
}) {
  const scaleX = imageRect.width / wideW;
  const scaleY = imageRect.height / panelHeight;
  const boxScreenW = panelWidth * boxWidth * scaleX;
  const anchorScreenX = (panelIndex * panelWidth + anchorX * panelWidth) * scaleX;
  const baselineY = anchorY * panelHeight * scaleY;
  const { transform } = textAnchorTransform(alignH);

  return (
    <div
      className={`absolute touch-none ${
        interactive
          ? `${isDragging || isResizing ? 'cursor-grabbing' : 'cursor-grab'}`
          : 'pointer-events-none'
      }`}
      style={{
        left: anchorScreenX,
        top: baselineY,
        transform,
        width: boxScreenW,
        ...style,
      }}
      onPointerDown={interactive ? (e) => onPointerDown(e, id) : undefined}
      onClick={interactive ? (e) => onClick(e, id) : undefined}
    >
      <div
        className={`relative h-full w-full ${
          interactive
            ? `rounded-md border-2 border-dashed px-1 py-0.5 ${
                selected ? 'border-accent bg-accent/10' : 'border-transparent hover:border-white/25'
              }`
            : ''
        }`}
      >
        {content}
        {interactive && selected && onResizePointerDown && (
          <div
            className="absolute -bottom-1.5 -right-1.5 z-10 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-accent bg-[#12121a]"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onResizePointerDown(e, id, boxWidth);
            }}
          />
        )}
      </div>
    </div>
  );
}

export function LivePanelText({
  panelIndex,
  panel,
  globalOptions,
  customFonts,
  panelWidth,
  panelHeight,
  panelCount,
  wideW,
  imageRect,
  freePosition,
  alwaysInteractive = false,
  selectedId,
  draggingId,
  resizingId = null,
  onPointerDown,
  onClick,
  onResizePointerDown,
}: LivePanelTextProps) {
  const opts = panelEffectiveOptions(globalOptions, panel);
  const positions = resolveTextPositions(panelWidth, panelHeight, panel, globalOptions);
  const titleFontSize = panelWidth * (opts.titleSize ?? 0.087) * (imageRect.width / wideW);
  const subtitleFontSize = panelWidth * (opts.subtitleSize ?? 0.043) * (imageRect.width / wideW);
  const titleAlignH = resolveTextAlignH(opts, positions.titleX);
  const subtitleAlignH = resolveTextAlignH(opts, positions.subtitleX);
  const interactive = alwaysInteractive || freePosition;

  return (
    <>
      {panel.title ? (
        <TextBlock
          id={textElementId(panelIndex, 'title')}
          role="title"
          content={formatPanelTextContent(panel.title, opts.titleUppercase)}
          anchorX={positions.titleX}
          anchorY={positions.titleY}
          panelIndex={panelIndex}
          panelWidth={panelWidth}
          panelHeight={panelHeight}
          wideW={wideW}
          imageRect={imageRect}
          alignH={titleAlignH}
          boxWidth={resolveTextBoxWidth('title', opts)}
          style={textStyle('title', opts, customFonts, titleFontSize, titleAlignH)}
          interactive={interactive}
          selected={selectedId === textElementId(panelIndex, 'title')}
          isDragging={draggingId === textElementId(panelIndex, 'title')}
          isResizing={resizingId === textElementId(panelIndex, 'title')}
          onPointerDown={onPointerDown}
          onClick={onClick}
          onResizePointerDown={onResizePointerDown}
        />
      ) : null}

      {panel.subtitle ? (
        <TextBlock
          id={textElementId(panelIndex, 'subtitle')}
          role="subtitle"
          content={formatPanelTextContent(panel.subtitle, opts.subtitleUppercase)}
          anchorX={positions.subtitleX}
          anchorY={positions.subtitleY}
          panelIndex={panelIndex}
          panelWidth={panelWidth}
          panelHeight={panelHeight}
          wideW={wideW}
          imageRect={imageRect}
          alignH={subtitleAlignH}
          boxWidth={resolveTextBoxWidth('subtitle', opts)}
          style={textStyle('subtitle', opts, customFonts, subtitleFontSize, subtitleAlignH)}
          interactive={interactive}
          selected={selectedId === textElementId(panelIndex, 'subtitle')}
          isDragging={draggingId === textElementId(panelIndex, 'subtitle')}
          isResizing={resizingId === textElementId(panelIndex, 'subtitle')}
          onPointerDown={onPointerDown}
          onClick={onClick}
          onResizePointerDown={onResizePointerDown}
        />
      ) : null}
    </>
  );
}

export function LivePanelTextLayer({
  panels,
  panelCount,
  globalOptions,
  customFonts,
  panelWidth,
  panelHeight,
  wideW,
  imageRect,
  alwaysInteractive = false,
  selectedId,
  draggingId,
  resizingId = null,
  onPointerDown,
  onClick,
  onResizePointerDown,
}: {
  panels: SeamlessPanelConfig[];
  panelCount: number;
  globalOptions: Partial<FrameOptions>;
  customFonts: CustomFont[];
  panelWidth: number;
  panelHeight: number;
  wideW: number;
  imageRect: { x: number; y: number; width: number; height: number };
  alwaysInteractive?: boolean;
  selectedId: string | null;
  draggingId: string | null;
  resizingId?: string | null;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
  onResizePointerDown?: (e: React.PointerEvent, id: string, currentWidth: number) => void;
}) {
  return (
    <>
      {Array.from({ length: panelCount }, (_, i) => {
        const panel = panels[i] ?? { title: '', subtitle: '' };
        if (!panel.title && !panel.subtitle) return null;
        const freePosition = !!(panel.style?.freePosition || globalOptions.freePosition);
        return (
          <LivePanelText
            key={i}
            panelIndex={i}
            panel={panel}
            globalOptions={globalOptions}
            customFonts={customFonts}
            panelWidth={panelWidth}
            panelHeight={panelHeight}
            panelCount={panelCount}
            wideW={wideW}
            imageRect={imageRect}
            freePosition={freePosition}
            alwaysInteractive={alwaysInteractive}
            selectedId={selectedId}
            draggingId={draggingId}
            resizingId={resizingId}
            onPointerDown={onPointerDown}
            onClick={onClick}
            onResizePointerDown={onResizePointerDown}
          />
        );
      })}
    </>
  );
}
