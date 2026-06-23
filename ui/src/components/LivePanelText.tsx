import {
  buildPanelTextBlockStyle,
  formatPanelTextContent,
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
  selectedId: string | null;
  draggingId: string | null;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
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
  freePosition,
  selected,
  isDragging,
  onPointerDown,
  onClick,
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
  freePosition: boolean;
  selected: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
}) {
  const scaleX = imageRect.width / wideW;
  const scaleY = imageRect.height / panelHeight;
  const panelScreenW = panelWidth * scaleX;
  const anchorScreenX = (panelIndex * panelWidth + anchorX * panelWidth) * scaleX;
  const baselineY = anchorY * panelHeight * scaleY;
  const { transform } = textAnchorTransform(alignH);

  return (
    <div
      className={`absolute touch-none ${
        freePosition
          ? `rounded-md border-2 border-dashed px-2 py-0.5 ${
              selected ? 'border-accent bg-accent/10' : 'border-transparent hover:border-white/25'
            } ${isDragging ? 'cursor-grabbing' : freePosition ? 'cursor-grab' : ''}`
          : 'pointer-events-none border-transparent'
      }`}
      style={{
        left: anchorScreenX,
        top: baselineY,
        transform,
        maxWidth: panelScreenW * 0.84,
        ...style,
      }}
      onPointerDown={freePosition ? (e) => onPointerDown(e, id) : undefined}
      onClick={freePosition ? (e) => onClick(e, id) : undefined}
    >
      {content}
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
  selectedId,
  draggingId,
  onPointerDown,
  onClick,
}: LivePanelTextProps) {
  const opts = panelEffectiveOptions(globalOptions, panel);
  const positions = resolveTextPositions(panelWidth, panelHeight, panel, globalOptions);
  const titleFontSize = panelWidth * (opts.titleSize ?? 0.087) * (imageRect.width / wideW);
  const subtitleFontSize = panelWidth * (opts.subtitleSize ?? 0.043) * (imageRect.width / wideW);
  const titleAlignH = resolveTextAlignH(opts, positions.titleX);
  const subtitleAlignH = resolveTextAlignH(opts, positions.subtitleX);

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
          style={textStyle('title', opts, customFonts, titleFontSize, titleAlignH)}
          freePosition={freePosition}
          selected={selectedId === textElementId(panelIndex, 'title')}
          isDragging={draggingId === textElementId(panelIndex, 'title')}
          onPointerDown={onPointerDown}
          onClick={onClick}
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
          style={textStyle('subtitle', opts, customFonts, subtitleFontSize, subtitleAlignH)}
          freePosition={freePosition}
          selected={selectedId === textElementId(panelIndex, 'subtitle')}
          isDragging={draggingId === textElementId(panelIndex, 'subtitle')}
          onPointerDown={onPointerDown}
          onClick={onClick}
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
  selectedId,
  draggingId,
  onPointerDown,
  onClick,
}: {
  panels: SeamlessPanelConfig[];
  panelCount: number;
  globalOptions: Partial<FrameOptions>;
  customFonts: CustomFont[];
  panelWidth: number;
  panelHeight: number;
  wideW: number;
  imageRect: { x: number; y: number; width: number; height: number };
  selectedId: string | null;
  draggingId: string | null;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
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
            selectedId={selectedId}
            draggingId={draggingId}
            onPointerDown={onPointerDown}
            onClick={onClick}
          />
        );
      })}
    </>
  );
}
