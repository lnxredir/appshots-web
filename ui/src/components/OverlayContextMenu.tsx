import { useEffect, useRef } from 'react';
import type { OverlayLayer } from '../types';
import { OVERLAY_LAYERS } from '../types';

interface OverlayContextMenuProps {
  x: number;
  y: number;
  layer: OverlayLayer;
  onLayerChange: (layer: OverlayLayer) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function OverlayContextMenu({
  x,
  y,
  layer,
  onLayerChange,
  onDelete,
  onClose,
}: OverlayContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[180px] overflow-hidden rounded-xl border border-border bg-[#12121a] py-1 shadow-2xl"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Layer</p>
      {OVERLAY_LAYERS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onLayerChange(option.value);
            onClose();
          }}
          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-panel-hover ${
            layer === option.value ? 'text-white' : 'text-muted'
          }`}
        >
          <span>{option.label}</span>
          {layer === option.value ? <span className="text-accent">✓</span> : null}
        </button>
      ))}

      <div className="my-1 border-t border-border" />

      <button
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="flex w-full px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
      >
        Delete
      </button>
    </div>
  );
}
