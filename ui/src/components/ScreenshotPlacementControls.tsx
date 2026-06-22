import type { DeviceInfo, FrameSettings } from '../types';
import {
  applyScreenshotAlign,
  placementFromOptions,
  placementToPatch,
  type ScreenshotAlignH,
  type ScreenshotAlignV,
} from '../lib/screenshot-placement';

interface ScreenshotPlacementControlsProps {
  settings: FrameSettings;
  device: DeviceInfo | undefined;
  onOptionsChange: (patch: Partial<FrameSettings['options']>) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
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

export function ScreenshotPlacementControls({
  settings,
  device,
  onOptionsChange,
  onInteractionStart,
  onInteractionEnd,
}: ScreenshotPlacementControlsProps) {
  if (!device) return null;

  const placement = placementFromOptions(
    settings.options,
    device,
    settings.orientation,
    settings.options.textPosition ?? 'bottom',
  );

  const finishSlider = (patch: Partial<FrameSettings['options']>, input: HTMLInputElement) => {
    if (patch.screenshotWidth !== undefined) patch.screenshotWidth = parseFloat(input.value);
    if (patch.screenshotRotation !== undefined) patch.screenshotRotation = parseInt(input.value, 10);
    onOptionsChange(patch);
    requestAnimationFrame(() => onInteractionEnd?.());
  };

  const applyAlign = (alignH: ScreenshotAlignH | null, alignV: ScreenshotAlignV | null) => {
    const next = applyScreenshotAlign(placement, alignH, alignV, device, settings.orientation);
    onOptionsChange(placementToPatch(next));
  };

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Screenshot placement</h3>
      <p className="text-xs leading-relaxed text-muted">
        Drag the phone in the preview, or use alignment and size controls below.
      </p>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Horizontal align</label>
        <div className="grid grid-cols-3 gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => applyAlign(align, null)}
              className="rounded-lg border border-border bg-panel px-2 py-2 text-xs capitalize transition hover:bg-panel-hover"
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Vertical align</label>
        <div className="grid grid-cols-3 gap-2">
          {(['top', 'middle', 'bottom'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => applyAlign(null, align)}
              className="rounded-lg border border-border bg-panel px-2 py-2 text-xs capitalize transition hover:bg-panel-hover"
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <Toggle
        label="Grid align"
        checked={settings.options.gridAlign ?? false}
        onChange={(gridAlign) => onOptionsChange({ gridAlign })}
      />

      <div>
        <label className="mb-1.5 flex justify-between text-xs font-medium text-muted">
          <span>Size</span>
          <span>{Math.round(placement.width * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={1.2}
          step={0.01}
          value={placement.width}
          onPointerDown={() => onInteractionStart?.()}
          onPointerUp={(e) => finishSlider({ screenshotWidth: placement.width }, e.currentTarget)}
          onPointerCancel={(e) => finishSlider({ screenshotWidth: placement.width }, e.currentTarget)}
          onInput={(e) =>
            onOptionsChange({ screenshotWidth: parseFloat(e.currentTarget.value) })
          }
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1.5 flex justify-between text-xs font-medium text-muted">
          <span>Rotation</span>
          <span>{placement.rotation}°</span>
        </label>
        <input
          type="range"
          min={-45}
          max={45}
          step={1}
          value={placement.rotation}
          onPointerDown={() => onInteractionStart?.()}
          onPointerUp={(e) => finishSlider({ screenshotRotation: placement.rotation }, e.currentTarget)}
          onPointerCancel={(e) =>
            finishSlider({ screenshotRotation: placement.rotation }, e.currentTarget)
          }
          onInput={(e) =>
            onOptionsChange({ screenshotRotation: parseInt(e.currentTarget.value, 10) })
          }
          className="w-full"
        />
      </div>
    </section>
  );
}
