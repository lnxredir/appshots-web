import { useCallback, useRef, useState } from 'react';
import { OverlayContextMenu } from './OverlayContextMenu';
import { layerLabel, layerZIndex } from '../lib/icons';
import type { OverlayLayer } from '../types';

interface DraggableOverlayProps {
  id: string;
  imageUrl: string;
  name: string;
  layer: OverlayLayer;
  rect: { x: number; y: number; width: number; height: number };
  imageRect: { x: number; y: number; width: number; height: number };
  canvasWidth: number;
  selected: boolean;
  isDragging: boolean;
  isResizing?: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onResizePointerDown: (e: React.PointerEvent, id: string) => void;
  onSelect: (id: string) => void;
  onLayerChange: (id: string, layer: OverlayLayer) => void;
  onDelete: (id: string) => void;
}

export function DraggableOverlay({
  id,
  imageUrl,
  name,
  layer,
  rect,
  imageRect,
  canvasWidth,
  selected,
  isDragging,
  isResizing = false,
  onPointerDown,
  onResizePointerDown,
  onSelect,
  onLayerChange,
  onDelete,
}: DraggableOverlayProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
    setMenu({ x: e.clientX, y: e.clientY });
  }, [id, onSelect]);

  return (
    <>
      <div
        className={`absolute touch-none ${
          isDragging || isResizing ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          left: rect.x - imageRect.x,
          top: rect.y - imageRect.y,
          width: rect.width,
          height: rect.height,
          zIndex: layerZIndex(layer) + (selected ? 1 : 0),
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          onPointerDown(e, id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
        onContextMenu={handleContextMenu}
      >
        <img
          src={imageUrl}
          alt={name}
          className={`h-full w-full object-contain ${
            selected || isDragging || isResizing ? 'opacity-100' : 'opacity-85'
          }`}
          draggable={false}
        />
        <div
          className={`pointer-events-none absolute inset-0 rounded border-2 border-dashed transition ${
            selected
              ? 'border-accent bg-accent/5'
              : 'border-white/15 bg-white/0 hover:border-white/30'
          }`}
        />
        {selected && (
          <span className="pointer-events-none absolute -top-5 left-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-white">
            {layerLabel(layer)}
          </span>
        )}
        {selected && (
          <div
            className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-accent bg-[#12121a]"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onResizePointerDown(e, id);
            }}
          />
        )}
      </div>

      {menu && (
        <OverlayContextMenu
          x={menu.x}
          y={menu.y}
          layer={layer}
          onLayerChange={(nextLayer) => onLayerChange(id, nextLayer)}
          onDelete={() => onDelete(id)}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

export function useOverlayResize(options: {
  canvasWidth: number;
  imageRect: { width: number } | null;
  maxWidth?: number;
  onResize: (id: string, width: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}) {
  const { canvasWidth, imageRect, maxWidth = 0.6, onResize, onInteractionStart, onInteractionEnd } = options;
  const [resizingId, setResizingId] = useState<string | null>(null);
  const resizeStartRef = useRef<{ id: string; startX: number; startWidth: number } | null>(null);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, id: string, currentWidth: number) => {
      e.preventDefault();
      e.stopPropagation();
      resizeStartRef.current = { id, startX: e.clientX, startWidth: currentWidth };
      setResizingId(id);
      onInteractionStart?.();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onInteractionStart],
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = resizeStartRef.current;
      if (!start || !imageRect) return;
      const scaleX = imageRect.width / canvasWidth;
      const deltaCanvas = (e.clientX - start.startX) / scaleX;
      const nextWidth = Math.min(maxWidth, Math.max(0.03, start.startWidth + deltaCanvas / canvasWidth));
      onResize(start.id, nextWidth);
    },
    [canvasWidth, imageRect, maxWidth, onResize],
  );

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (resizingId) onInteractionEnd?.();
      resizeStartRef.current = null;
      setResizingId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    [resizingId, onInteractionEnd],
  );

  return {
    resizingId,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
  };
}
