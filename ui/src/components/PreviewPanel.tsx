import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasOverflowOverlay } from './CanvasOverflowOverlay';
import { DraggableOverlay, useOverlayResize } from './DraggableOverlay';
import { LiveDeviceFrame } from './LiveDeviceFrame';
import { LivePanelTextLayer } from './LivePanelText';
import { PlacementGrid } from './PlacementGrid';
import { WarningDialog } from './WarningDialog';
import { useOverflowWarning } from '../hooks/useOverflowWarning';
import { getContainedImageRect, stickerScreenRect } from '../lib/image-bounds';
import { getPlacementOverflow } from '../lib/placement-overflow';
import { parseTextElementId } from '../lib/panel-text-layout';
import {
  placementFromOptions,
  snapPlacementToGrid,
  snapTextToGrid,
  placementToPatch,
} from '../lib/screenshot-placement';
import type { DeviceFrameOptions } from '../lib/frame-colors';
import type { CustomFont, DeviceInfo, DevicePlacement, FrameSettings, OverlayLayer, Sticker } from '../types';

interface PreviewPanelProps {
  previewUrl: string | null;
  loading: boolean;
  error: string | null;
  deviceLabel: string;
  dimensions: string;
  canvasWidth: number;
  canvasHeight: number;
  screenshotUrl: string | null;
  device: DeviceInfo | undefined;
  orientation: 'portrait' | 'landscape';
  settings: FrameSettings;
  frameOptions: DeviceFrameOptions;
  customFonts: CustomFont[];
  stickers: Sticker[];
  selectedStickerId: string | null;
  selectedTextId: string | null;
  onScreenshotMove: (patch: Partial<FrameSettings['options']>) => void;
  onStickerMove: (id: string, x: number, y: number) => void;
  onTextMove: (id: string, localX: number, localY: number) => void;
  onStickerResize: (id: string, width: number) => void;
  onStickerLayerChange: (id: string, layer: OverlayLayer) => void;
  onStickerRemove: (id: string) => void;
  onStickerSelect: (id: string | null) => void;
  onTextSelect: (id: string | null) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onDownload: () => void;
  downloading?: boolean;
  hasPreview: boolean;
}

const PREVIEW_PADDING = 24;
const SCREENSHOT_ID = 'screenshot';

export function PreviewPanel({
  previewUrl,
  loading,
  error,
  deviceLabel,
  dimensions,
  canvasWidth,
  canvasHeight,
  screenshotUrl,
  device,
  orientation,
  settings,
  frameOptions,
  customFonts,
  stickers,
  selectedStickerId,
  selectedTextId,
  onScreenshotMove,
  onStickerMove,
  onTextMove,
  onStickerResize,
  onStickerLayerChange,
  onStickerRemove,
  onStickerSelect,
  onTextSelect,
  onInteractionStart,
  onInteractionEnd,
  onDownload,
  downloading = false,
  hasPreview,
}: PreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const placement = device
    ? placementFromOptions(
        settings.options,
        device,
        orientation,
        settings.options.textPosition ?? 'bottom',
      )
    : null;

  const screenshotPlacement: DevicePlacement | null =
    screenshotUrl && placement
      ? {
          id: SCREENSHOT_ID,
          file: new File([], 'screenshot'),
          url: screenshotUrl,
          name: 'Screenshot',
          x: placement.x,
          y: placement.y,
          width: placement.width,
          rotation: placement.rotation,
        }
      : null;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const imageRect =
    containerSize.w > 0 && canvasWidth > 0
      ? getContainedImageRect(containerSize.w, containerSize.h, canvasWidth, canvasHeight, PREVIEW_PADDING)
      : null;

  const {
    resizingId,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
  } = useOverlayResize({
    canvasWidth,
    imageRect,
    onResize: onStickerResize,
    onInteractionStart,
    onInteractionEnd,
  });

  const handleScreenshotPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onTextSelect(null);
      onStickerSelect(null);

      if (!screenshotPlacement || !containerRef.current || !imageRect) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const scaleX = imageRect.width / canvasWidth;
      const scaleY = imageRect.height / canvasHeight;
      const left = imageRect.x + screenshotPlacement.x * canvasWidth * scaleX;
      const top = imageRect.y + screenshotPlacement.y * canvasHeight * scaleY;

      dragOffsetRef.current = {
        x: e.clientX - containerRect.left - left,
        y: e.clientY - containerRect.top - top,
      };

      setDraggingId(SCREENSHOT_ID);
      onInteractionStart?.();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onStickerSelect, onInteractionStart, screenshotPlacement, imageRect, canvasWidth, canvasHeight],
  );

  const handleStickerPointerDown = useCallback(
    (e: React.PointerEvent, stickerId: string) => {
      e.preventDefault();
      e.stopPropagation();
      onTextSelect(null);
      onStickerSelect(stickerId);

      const sticker = stickers.find((s) => s.id === stickerId);
      if (!sticker || !containerRef.current || !imageRect) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const rect = stickerScreenRect(sticker, imageRect, canvasWidth, canvasHeight);
      dragOffsetRef.current = {
        x: e.clientX - containerRect.left - rect.x,
        y: e.clientY - containerRect.top - rect.y,
      };

      setDraggingId(stickerId);
      onInteractionStart?.();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onStickerSelect, onInteractionStart, stickers, imageRect, canvasWidth, canvasHeight],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (resizingId) {
        handleResizePointerMove(e);
        return;
      }

      if (!draggingId || !containerRef.current || !imageRect) return;

      const textMeta = parseTextElementId(draggingId);
      if (textMeta) {
        const rect = containerRef.current.getBoundingClientRect();
        let localX = (e.clientX - rect.left - imageRect.x) / imageRect.width;
        let localY = (e.clientY - rect.top - imageRect.y) / imageRect.height;
        if (settings.options.textGridAlign) {
          const snapped = snapTextToGrid(localX, localY, canvasWidth, canvasHeight, true);
          localX = snapped.x;
          localY = snapped.y;
        }
        onTextMove(
          draggingId,
          Math.min(1, Math.max(0, localX)),
          Math.min(1, Math.max(0, localY)),
        );
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const localX = e.clientX - rect.left - dragOffsetRef.current.x;
      const localY = e.clientY - rect.top - dragOffsetRef.current.y;
      const relX = (localX - imageRect.x) / imageRect.width;
      const relY = (localY - imageRect.y) / imageRect.height;

      if (draggingId === SCREENSHOT_ID && device && placement) {
        let next = { ...placement, x: relX, y: relY };
        if (settings.options.gridAlign) {
          next = snapPlacementToGrid(next, device, orientation, true);
        }
        onScreenshotMove(placementToPatch(next));
        return;
      }

      onStickerMove(
        draggingId,
        Math.max(0, Math.min(1, relX)),
        Math.max(0, Math.min(1, relY)),
      );
    },
    [
      draggingId,
      resizingId,
      imageRect,
      device,
      placement,
      orientation,
      settings.options.gridAlign,
      settings.options.textGridAlign,
      canvasWidth,
      canvasHeight,
      onScreenshotMove,
      onStickerMove,
      onTextMove,
      handleResizePointerMove,
    ],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
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
    },
    [draggingId, resizingId, onInteractionEnd, handleResizePointerUp],
  );

  const showLiveDevice = !!(previewUrl && screenshotPlacement && device && frameOptions.deviceFrame !== false);
  const showLiveText = !!(settings.title || settings.subtitle);
  const singlePanel = [{ title: settings.title, subtitle: settings.subtitle }];

  const overflow = useMemo(() => {
    if (!device || !screenshotPlacement || !imageRect) {
      return { hasOverflow: false, regions: [] as { left: number; top: number; width: number; height: number }[] };
    }

    return getPlacementOverflow(
      screenshotPlacement,
      device,
      canvasWidth,
      canvasHeight,
      canvasWidth,
      orientation,
      imageRect.width,
      imageRect.height,
    );
  }, [device, screenshotPlacement, imageRect, canvasWidth, canvasHeight, orientation]);

  const { open: overflowWarningOpen, dismiss: dismissOverflowWarning } = useOverflowWarning(
    overflow.hasOverflow,
  );

  const handleTextPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      onTextSelect(id);
      onStickerSelect(null);
      setDraggingId(id);
      onInteractionStart?.();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onTextSelect, onStickerSelect, onInteractionStart],
  );

  const handleTextClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onTextSelect(id);
      onStickerSelect(null);
    },
    [onTextSelect, onStickerSelect],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Preview</h2>
          <p className="text-sm text-muted">
            {deviceLabel} · {dimensions}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={!hasPreview || loading || downloading}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {downloading ? 'Exporting…' : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PNG
            </>
          )}
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-[#08080c]"
        onClick={() => {
          onTextSelect(null);
          onStickerSelect(null);
        }}
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-panel text-muted">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12" y2="18.01" />
              </svg>
            </div>
            <p className="text-sm text-muted">Upload a screenshot to see your App Store preview</p>
          </div>
        )}

        {previewUrl && imageRect && (
          <div
            className="relative shrink-0"
            style={{ width: imageRect.width, height: imageRect.height }}
          >
            <img
              src={previewUrl}
              alt="Framed screenshot preview"
              className="h-full w-full object-fill"
              draggable={false}
            />

            {(settings.options.gridAlign || settings.options.textGridAlign) && (
              <PlacementGrid canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
            )}

            {stickers
              .filter((s) => s.layer === 'background')
              .map((sticker) => {
                const rect = stickerScreenRect(sticker, imageRect, canvasWidth, canvasHeight);
                const selected = sticker.id === selectedStickerId;
                return (
                  <DraggableOverlay
                    key={sticker.id}
                    id={sticker.id}
                    imageUrl={sticker.url}
                    name={sticker.name}
                    layer={sticker.layer}
                    rect={rect}
                    imageRect={imageRect}
                    canvasWidth={canvasWidth}
                    selected={selected}
                    isDragging={sticker.id === draggingId}
                    isResizing={sticker.id === resizingId}
                    onPointerDown={handleStickerPointerDown}
                    onResizePointerDown={(e, id) => handleResizePointerDown(e, id, sticker.width)}
                    onSelect={onStickerSelect}
                    onLayerChange={onStickerLayerChange}
                    onDelete={onStickerRemove}
                  />
                );
              })}

            {showLiveDevice && screenshotPlacement && device && (
              <LiveDeviceFrame
                placement={screenshotPlacement}
                device={device}
                orientation={orientation}
                panelWidth={canvasWidth}
                panelHeight={canvasHeight}
                wideW={canvasWidth}
                imageRect={imageRect}
                frameOptions={frameOptions}
                selected
                isDragging={draggingId === SCREENSHOT_ID}
                onPointerDown={handleScreenshotPointerDown}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {stickers
              .filter((s) => s.layer === 'behind-text')
              .map((sticker) => {
                const rect = stickerScreenRect(sticker, imageRect, canvasWidth, canvasHeight);
                const selected = sticker.id === selectedStickerId;
                return (
                  <DraggableOverlay
                    key={sticker.id}
                    id={sticker.id}
                    imageUrl={sticker.url}
                    name={sticker.name}
                    layer={sticker.layer}
                    rect={rect}
                    imageRect={imageRect}
                    canvasWidth={canvasWidth}
                    selected={selected}
                    isDragging={sticker.id === draggingId}
                    isResizing={sticker.id === resizingId}
                    onPointerDown={handleStickerPointerDown}
                    onResizePointerDown={(e, id) => handleResizePointerDown(e, id, sticker.width)}
                    onSelect={onStickerSelect}
                    onLayerChange={onStickerLayerChange}
                    onDelete={onStickerRemove}
                  />
                );
              })}

            {showLiveText && (
              <LivePanelTextLayer
                panels={singlePanel}
                panelCount={1}
                globalOptions={settings.options}
                customFonts={customFonts}
                panelWidth={canvasWidth}
                panelHeight={canvasHeight}
                wideW={canvasWidth}
                imageRect={imageRect}
                selectedId={selectedTextId}
                draggingId={draggingId}
                onPointerDown={handleTextPointerDown}
                onClick={handleTextClick}
              />
            )}

            {stickers
              .filter((s) => s.layer === 'foreground')
              .map((sticker) => {
                const rect = stickerScreenRect(sticker, imageRect, canvasWidth, canvasHeight);
                const selected = sticker.id === selectedStickerId;
                return (
                  <DraggableOverlay
                    key={sticker.id}
                    id={sticker.id}
                    imageUrl={sticker.url}
                    name={sticker.name}
                    layer={sticker.layer}
                    rect={rect}
                    imageRect={imageRect}
                    canvasWidth={canvasWidth}
                    selected={selected}
                    isDragging={sticker.id === draggingId}
                    isResizing={sticker.id === resizingId}
                    onPointerDown={handleStickerPointerDown}
                    onResizePointerDown={(e, id) => handleResizePointerDown(e, id, sticker.width)}
                    onSelect={onStickerSelect}
                    onLayerChange={onStickerLayerChange}
                    onDelete={onStickerRemove}
                  />
                );
              })}

            <CanvasOverflowOverlay
              canvasWidth={imageRect.width}
              canvasHeight={imageRect.height}
              regions={overflow.regions}
              active={overflow.hasOverflow}
            />
          </div>
        )}
      </div>

      {previewUrl && (
        <p className="mt-2 text-center text-xs text-muted">
          Drag phone to reposition · sliders for size and rotation · alignment buttons in sidebar
          {settings.options.freePosition && (settings.title || settings.subtitle)
            ? ' · drag title/subtitle when free positioning is on'
            : ''}
          {settings.options.textGridAlign ? ' · text snaps to grid' : ''}
          {stickers.length > 0 ? ' · right-click stickers for layer and delete' : ''}
        </p>
      )}

      <WarningDialog
        open={overflowWarningOpen}
        title="Screenshot extends outside the frame"
        message="The highlighted red areas fall outside the export canvas and will be cropped from your final image. Reposition or resize the screenshot to keep it within the frame."
        allowDontRemind
        onConfirm={dismissOverflowWarning}
      />
    </div>
  );
}
