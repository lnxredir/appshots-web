import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasOverflowOverlay } from './CanvasOverflowOverlay';
import { DraggableOverlay, useOverlayResize } from './DraggableOverlay';
import { LiveDeviceFrame } from './LiveDeviceFrame';
import { LivePanelTextLayer } from './LivePanelText';
import { PlacementGrid } from './PlacementGrid';
import { WarningDialog } from './WarningDialog';
import { useOverflowWarning } from '../hooks/useOverflowWarning';
import { getPhoneDimensions } from '../lib/device-bounds';
import { getContainedImageRect } from '../lib/image-bounds';
import { localXFromWide, panelEffectiveOptions, parseTextElementId } from '../lib/panel-text-layout';
import { getPlacementOverflow, type ScreenRect } from '../lib/placement-overflow';
import { snapTextToGrid } from '../lib/screenshot-placement';
import type { DeviceFrameOptions } from '../lib/frame-colors';
import type { CustomFont, DeviceInfo, DevicePlacement, FrameOptions, OverlayLayer, SeamlessPanelConfig, Sticker } from '../types';

export interface DraggableElement {
  id: string;
  x: number;
  y: number;
  width: number;
  aspectRatio?: number;
  rotation?: number;
  kind: 'sticker' | 'device';
}

interface SeamlessPreviewPanelProps {
  previewUrl: string | null;
  loading: boolean;
  error: string | null;
  deviceLabel: string;
  device: DeviceInfo | undefined;
  orientation: 'portrait' | 'landscape';
  panelCount: number;
  panelWidth: number;
  panelHeight: number;
  panels: SeamlessPanelConfig[];
  globalOptions: Partial<FrameOptions>;
  customFonts: CustomFont[];
  stickers: Sticker[];
  devicePlacements: DevicePlacement[];
  frameOptions: DeviceFrameOptions;
  elements: DraggableElement[];
  selectedId: string | null;
  onElementMove: (id: string, x: number, y: number) => void;
  onTextMove: (id: string, localX: number, localY: number) => void;
  onStickerResize: (id: string, width: number) => void;
  onStickerLayerChange: (id: string, layer: OverlayLayer) => void;
  onStickerRemove: (id: string) => void;
  onElementSelect: (id: string | null) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onDownloadAll: () => void;
  downloading?: boolean;
  hasPreview: boolean;
}

const PREVIEW_PADDING = 24;

function elementScreenRect(
  el: DraggableElement,
  imageRect: { x: number; y: number; width: number; height: number },
  wideW: number,
  panelH: number,
  panelW: number,
  device: DeviceInfo | undefined,
  orientation: 'portrait' | 'landscape',
) {
  if (el.kind === 'device' && device) {
    const { phoneW, phoneH } = getPhoneDimensions(device, panelW, el.width, orientation);
    const scaleX = imageRect.width / wideW;
    const scaleY = imageRect.height / panelH;
    return {
      x: imageRect.x + el.x * wideW * scaleX,
      y: imageRect.y + el.y * panelH * scaleY,
      width: phoneW * scaleX,
      height: phoneH * scaleY,
    };
  }

  const stickerW = wideW * el.width;
  const stickerH = stickerW * (el.aspectRatio ?? 1);
  const scaleX = imageRect.width / wideW;
  const scaleY = imageRect.height / panelH;
  return {
    x: imageRect.x + el.x * wideW * scaleX,
    y: imageRect.y + el.y * panelH * scaleY,
    width: stickerW * scaleX,
    height: stickerH * scaleY,
  };
}

export function SeamlessPreviewPanel({
  previewUrl,
  loading,
  error,
  deviceLabel,
  device,
  orientation,
  panelCount,
  panelWidth,
  panelHeight,
  panels,
  globalOptions,
  customFonts,
  stickers,
  devicePlacements,
  frameOptions,
  elements,
  selectedId,
  onElementMove,
  onTextMove,
  onStickerResize,
  onStickerLayerChange,
  onStickerRemove,
  onElementSelect,
  onInteractionStart,
  onInteractionEnd,
  onDownloadAll,
  downloading = false,
  hasPreview,
}: SeamlessPreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const wideW = panelWidth * panelCount;

  const showTextGrid =
    !!globalOptions.textGridAlign ||
    panels.some((panel) => panelEffectiveOptions(globalOptions, panel).textGridAlign);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const imageRect =
    containerSize.w > 0
      ? getContainedImageRect(containerSize.w, containerSize.h, wideW, panelHeight, PREVIEW_PADDING)
      : null;

  const overflow = useMemo(() => {
    if (!device || !imageRect || devicePlacements.length === 0) {
      return { hasOverflow: false, regions: [] as ScreenRect[] };
    }

    const regions: ScreenRect[] = [];
    let hasOverflow = false;

    for (const placement of devicePlacements) {
      const result = getPlacementOverflow(
        placement,
        device,
        panelWidth,
        panelHeight,
        wideW,
        orientation,
        imageRect.width,
        imageRect.height,
      );
      if (result.hasOverflow) hasOverflow = true;
      regions.push(...result.regions);
    }

    return { hasOverflow, regions };
  }, [device, devicePlacements, imageRect, panelWidth, panelHeight, wideW, orientation]);

  const { open: overflowWarningOpen, dismiss: dismissOverflowWarning } = useOverflowWarning(
    overflow.hasOverflow,
  );

  const {
    resizingId,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
  } = useOverlayResize({
    canvasWidth: wideW,
    imageRect,
    onResize: onStickerResize,
    onInteractionStart,
    onInteractionEnd,
  });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      onElementSelect(id);
      const textMeta = parseTextElementId(id);
      if (textMeta) {
        setDraggingId(id);
        onInteractionStart?.();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      const el = elements.find((item) => item.id === id);
      if (!el || !containerRef.current || !imageRect) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const rect = elementScreenRect(el, imageRect, wideW, panelHeight, panelWidth, device, orientation);
      dragOffsetRef.current = {
        x: e.clientX - containerRect.left - rect.x,
        y: e.clientY - containerRect.top - rect.y,
      };
      setDraggingId(id);
      onInteractionStart?.();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onElementSelect, onInteractionStart, elements, imageRect, wideW, panelHeight, panelWidth, device, orientation],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (resizingId) {
        handleResizePointerMove(e);
        return;
      }

      if (!draggingId || !containerRef.current || !imageRect) return;
      const textMeta = parseTextElementId(draggingId);
      const rect = containerRef.current.getBoundingClientRect();

      if (textMeta) {
        let localX = localXFromWide(
          (e.clientX - rect.left - imageRect.x) / imageRect.width,
          textMeta.panelIndex,
          panelCount,
        );
        let localY = (e.clientY - rect.top - imageRect.y) / imageRect.height;
        const panel = panels[textMeta.panelIndex] ?? { title: '', subtitle: '' };
        const panelOpts = panelEffectiveOptions(globalOptions, panel);
        if (panelOpts.textGridAlign) {
          const snapped = snapTextToGrid(localX, localY, panelWidth, panelHeight, true);
          localX = snapped.x;
          localY = snapped.y;
        }
        onTextMove(draggingId, Math.min(1, Math.max(0, localX)), Math.min(1, Math.max(0, localY)));
        return;
      }

      const localX = e.clientX - rect.left - dragOffsetRef.current.x;
      const localY = e.clientY - rect.top - dragOffsetRef.current.y;
      const relX = (localX - imageRect.x) / imageRect.width;
      const relY = (localY - imageRect.y) / imageRect.height;
      onElementMove(draggingId, relX, relY);
    },
    [draggingId, resizingId, imageRect, onElementMove, onTextMove, panelCount, panels, globalOptions, panelWidth, panelHeight, handleResizePointerMove],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (resizingId) {
      handleResizePointerUp(e);
      return;
    }
    if (draggingId) onInteractionEnd?.();
    setDraggingId(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, [draggingId, resizingId, onInteractionEnd, handleResizePointerUp]);

  const renderStickerOverlays = (layer: OverlayLayer) =>
    stickers
      .filter((sticker) => sticker.layer === layer)
      .map((sticker) => {
        const el = elements.find((item) => item.id === sticker.id);
        if (!el) return null;
        const rect = elementScreenRect(el, imageRect!, wideW, panelHeight, panelWidth, device, orientation);
        const selected = sticker.id === selectedId;

        return (
          <DraggableOverlay
            key={sticker.id}
            id={sticker.id}
            imageUrl={sticker.url}
            name={sticker.name}
            layer={sticker.layer}
            rect={rect}
            imageRect={imageRect!}
            canvasWidth={wideW}
            selected={selected}
            isDragging={sticker.id === draggingId}
            isResizing={sticker.id === resizingId}
            onPointerDown={handlePointerDown}
            onResizePointerDown={(e, id) => handleResizePointerDown(e, id, sticker.width)}
            onSelect={onElementSelect}
            onLayerChange={onStickerLayerChange}
            onDelete={onStickerRemove}
          />
        );
      });

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Seamless preview</h2>
          <p className="text-sm text-muted">
            {deviceLabel} · {panelCount} panels · {panelWidth}×{panelHeight} each
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadAll}
          disabled={!hasPreview || loading || downloading}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {downloading ? 'Exporting…' : 'Download all panels'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-auto rounded-2xl border border-border bg-[#08080c]"
        onClick={() => onElementSelect(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {loading && !previewUrl && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              Rendering…
            </div>
          </div>
        )}

        {loading && previewUrl && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-muted backdrop-blur-sm">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Updating…
          </div>
        )}

        {error && (
          <div className="max-w-sm px-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!previewUrl && !error && !loading && (
          <div className="px-6 text-center">
            <p className="text-sm text-muted">Add phone frames to build your seamless carousel</p>
          </div>
        )}

        {previewUrl && imageRect && (
          <div
            className="relative shrink-0"
            style={{ width: imageRect.width, height: imageRect.height }}
          >
            <img
              src={previewUrl}
              alt="Seamless preview"
              className="h-full w-full object-fill"
              draggable={false}
            />

            {showTextGrid && (
              <PlacementGrid canvasWidth={wideW} canvasHeight={panelHeight} />
            )}

            {Array.from({ length: panelCount - 1 }, (_, i) => {
              const x = ((i + 1) / panelCount) * 100;
              return (
                <div
                  key={i}
                  className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/30"
                  style={{ left: `${x}%` }}
                />
              );
            })}

            {renderStickerOverlays('background')}

            {device && devicePlacements.map((placement) => (
              <LiveDeviceFrame
                key={placement.id}
                placement={placement}
                device={device}
                orientation={orientation}
                panelWidth={panelWidth}
                panelHeight={panelHeight}
                wideW={wideW}
                imageRect={imageRect}
                frameOptions={frameOptions}
                selected={placement.id === selectedId}
                isDragging={placement.id === draggingId}
                onPointerDown={(e) => handlePointerDown(e, placement.id)}
                onClick={(e) => e.stopPropagation()}
              />
            ))}

            {renderStickerOverlays('behind-text')}

            <LivePanelTextLayer
              panels={panels}
              panelCount={panelCount}
              globalOptions={globalOptions}
              customFonts={customFonts}
              panelWidth={panelWidth}
              panelHeight={panelHeight}
              wideW={wideW}
              imageRect={imageRect}
              selectedId={selectedId}
              draggingId={draggingId}
              onPointerDown={handlePointerDown}
              onClick={(e, id) => {
                e.stopPropagation();
                onElementSelect(id);
              }}
            />

            {renderStickerOverlays('foreground')}

            <CanvasOverflowOverlay
              canvasWidth={imageRect.width}
              canvasHeight={imageRect.height}
              regions={overflow.regions}
              active={overflow.hasOverflow}
            />
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-muted">
        Drag phones and icons to reposition · corner handle to resize · right-click icons/stickers for layer and delete
        {showTextGrid ? ' · grid align on for text' : ''}
      </p>

      <WarningDialog
        open={overflowWarningOpen}
        title="Screenshot extends outside the frame"
        message="The highlighted red areas fall outside the export canvas and will be cropped from your final image. Reposition or resize the phone frames to keep them within the frame."
        onConfirm={dismissOverflowWarning}
      />
    </div>
  );
}
