import { useRef } from 'react';
import { layerLabel, refreshIconSticker } from '../lib/icons';
import type { OverlayLayer, Sticker } from '../types';
import { OVERLAY_LAYERS } from '../types';

interface StickerControlsProps {
  stickers: Sticker[];
  selectedId: string | null;
  onAdd: (files: FileList) => void;
  onUpdate: (id: string, patch: Partial<Sticker>) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string | null) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function StickerControls({
  stickers,
  selectedId,
  onAdd,
  onUpdate,
  onRemove,
  onSelect,
  onInteractionStart,
  onInteractionEnd,
}: StickerControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadStickers = stickers.filter((sticker) => sticker.source !== 'icon');
  const iconStickers = stickers.filter((sticker) => sticker.source === 'icon');

  const handleIconColorChange = (sticker: Sticker, iconColor: string) => {
    void refreshIconSticker(sticker, { iconColor }).then((next) => onUpdate(sticker.id, next));
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Stickers</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-border bg-panel px-2.5 py-1 text-xs text-muted transition hover:bg-panel-hover hover:text-white"
        >
          + Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAdd(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {uploadStickers.length === 0 ? (
        <label
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-border bg-panel px-4 py-6 text-center transition hover:border-accent/50 hover:bg-panel-hover"
        >
          <span className="mb-1 text-2xl">✨</span>
          <span className="text-sm text-muted">Upload images to use as stickers</span>
          <span className="mt-1 text-xs text-muted">Or add icons from the Icons section below</span>
        </label>
      ) : (
        <div className="space-y-2">
          {uploadStickers.map((sticker) => renderStickerRow(sticker))}
        </div>
      )}

      {iconStickers.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted">Placed icons</p>
          {iconStickers.map((sticker) => renderStickerRow(sticker, true))}
        </div>
      )}
    </section>
  );

  function renderStickerRow(sticker: Sticker, isIcon = false) {
    const selected = sticker.id === selectedId;
    return (
      <div
        key={sticker.id}
        className={`rounded-xl border p-3 transition ${
          selected ? 'border-accent bg-accent/10' : 'border-border bg-panel'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect(selected ? null : sticker.id)}
          className="flex w-full items-center gap-3 text-left"
        >
          <img
            src={sticker.url}
            alt=""
            className="h-10 w-10 rounded-lg border border-border object-contain bg-[#08080c] p-1"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{sticker.name}</p>
            <p className="text-xs text-muted">{layerLabel(sticker.layer)}</p>
          </div>
        </button>

        {selected && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {isIcon && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Icon color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={sticker.iconColor ?? '#ffffff'}
                    onChange={(e) => handleIconColorChange(sticker, e.target.value)}
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-panel"
                  />
                  <input
                    type="text"
                    value={sticker.iconColor ?? '#ffffff'}
                    onChange={(e) => handleIconColorChange(sticker, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-panel px-3 py-2 font-mono text-xs outline-none transition focus:border-accent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Layer</label>
              <div className="grid grid-cols-1 gap-2">
                {OVERLAY_LAYERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onUpdate(sticker.id, { layer: option.value as OverlayLayer })}
                    className={`rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                      sticker.layer === option.value
                        ? 'border-accent bg-accent/15 text-white'
                        : 'border-border bg-[#0e0e14] text-muted hover:text-white'
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="mt-0.5 block text-[10px] text-muted">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex justify-between text-xs font-medium text-muted">
                <span>Size</span>
                <span>{Math.round(sticker.width * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.03}
                max={0.6}
                step={0.01}
                value={sticker.width}
                onPointerDown={() => onInteractionStart?.()}
                onPointerUp={() => onInteractionEnd?.()}
                onPointerCancel={() => onInteractionEnd?.()}
                onChange={(e) => onUpdate(sticker.id, { width: parseFloat(e.target.value) })}
                className="w-full accent-accent"
              />
            </div>

            <button
              type="button"
              onClick={() => onRemove(sticker.id)}
              className="w-full rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    );
  }
}
