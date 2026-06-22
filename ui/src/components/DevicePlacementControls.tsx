import { useRef } from 'react';
import type { DeviceInfo, DevicePlacement } from '../types';
import { applyWideDeviceAlign, defaultDevicePlacement } from '../lib/device-bounds';
import { PlacementAlignButtons } from './PlacementAlignButtons';

interface DevicePlacementControlsProps {
  devices: DevicePlacement[];
  selectedId: string | null;
  deviceInfo: DeviceInfo;
  panelCount: number;
  orientation: 'portrait' | 'landscape';
  gridAlign?: boolean;
  onGridAlignChange?: (gridAlign: boolean) => void;
  onAdd: (files: FileList) => void;
  onUpdate: (id: string, patch: Partial<DevicePlacement>) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string | null) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function createDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadDeviceFromFile(
  file: File,
  panelCount: number,
  device: DeviceInfo,
  orientation: 'portrait' | 'landscape',
): Promise<DevicePlacement> {
  const url = URL.createObjectURL(file);
  const placement = defaultDevicePlacement(panelCount, device, orientation);

  return {
    id: createDeviceId(),
    file,
    url,
    name: file.name,
    ...placement,
  };
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-panel px-3 py-2.5 transition hover:bg-panel-hover">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </label>
  );
}

export function DevicePlacementControls({
  devices,
  selectedId,
  deviceInfo,
  panelCount,
  orientation,
  gridAlign = false,
  onGridAlignChange,
  onAdd,
  onUpdate,
  onRemove,
  onSelect,
  onInteractionStart,
  onInteractionEnd,
}: DevicePlacementControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const finishSlider = (
    id: string,
    patch: Partial<DevicePlacement>,
    input: HTMLInputElement,
  ) => {
    if (patch.width !== undefined) patch.width = parseFloat(input.value);
    if (patch.rotation !== undefined) patch.rotation = parseInt(input.value, 10);
    onUpdate(id, patch);
    requestAnimationFrame(() => onInteractionEnd?.());
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Phone frames</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-border bg-panel px-2.5 py-1 text-xs text-muted transition hover:bg-panel-hover hover:text-white"
        >
          + Add
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAdd(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Add screenshots inside device frames. Drag them across panel boundaries for a seamless carousel effect.
      </p>

      {devices.length === 0 ? (
        <label
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-border bg-panel px-4 py-6 text-center transition hover:border-accent/50 hover:bg-panel-hover"
        >
          <span className="text-sm text-muted">Upload screenshots for each phone</span>
        </label>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => {
            const selected = device.id === selectedId;
            return (
              <div
                key={device.id}
                className={`rounded-xl border p-3 transition ${
                  selected ? 'border-accent bg-accent/10' : 'border-border bg-panel'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(selected ? null : device.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <img
                    src={device.url}
                    alt=""
                    className="h-10 w-10 rounded-lg border border-border object-cover bg-[#08080c]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{device.name}</p>
                    <p className="text-xs text-muted">
                      {device.rotation !== 0 ? `${device.rotation}° · ` : ''}
                      {Math.round(device.width * 100)}% size
                    </p>
                  </div>
                </button>

                {selected && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <PlacementAlignButtons
                      onAlignH={(align) => {
                        const next = applyWideDeviceAlign(
                          device,
                          align,
                          null,
                          deviceInfo,
                          panelCount,
                          orientation,
                        );
                        onUpdate(device.id, { x: next.x, y: next.y });
                      }}
                      onAlignV={(align) => {
                        const next = applyWideDeviceAlign(
                          device,
                          null,
                          align,
                          deviceInfo,
                          panelCount,
                          orientation,
                        );
                        onUpdate(device.id, { x: next.x, y: next.y });
                      }}
                    />

                    {onGridAlignChange && (
                      <Toggle
                        label="Grid align"
                        checked={gridAlign}
                        onChange={onGridAlignChange}
                      />
                    )}

                    <div>
                      <label className="mb-1.5 flex justify-between text-xs font-medium text-muted">
                        <span>Size</span>
                        <span>{Math.round(device.width * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min={0.3}
                        max={1.2}
                        step={0.01}
                        value={device.width}
                        onPointerDown={() => onInteractionStart?.()}
                        onPointerUp={(e) =>
                          finishSlider(device.id, { width: device.width }, e.currentTarget)
                        }
                        onPointerCancel={(e) =>
                          finishSlider(device.id, { width: device.width }, e.currentTarget)
                        }
                        onInput={(e) =>
                          onUpdate(device.id, { width: parseFloat(e.currentTarget.value) })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 flex justify-between text-xs font-medium text-muted">
                        <span>Rotation</span>
                        <span>{device.rotation}°</span>
                      </label>
                      <input
                        type="range"
                        min={-45}
                        max={45}
                        step={1}
                        value={device.rotation}
                        onPointerDown={() => onInteractionStart?.()}
                        onPointerUp={(e) =>
                          finishSlider(device.id, { rotation: device.rotation }, e.currentTarget)
                        }
                        onPointerCancel={(e) =>
                          finishSlider(device.id, { rotation: device.rotation }, e.currentTarget)
                        }
                        onInput={(e) =>
                          onUpdate(device.id, { rotation: parseInt(e.currentTarget.value, 10) })
                        }
                        className="w-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(device.id)}
                      className="w-full rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
                    >
                      Remove phone
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
