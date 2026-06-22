import type { FrameSettings } from '../types';

interface ModeSelectorProps {
  settings: FrameSettings;
  onModeChange: (mode: 'single' | 'seamless') => void;
}

export function ModeSelector({ settings, onModeChange }: ModeSelectorProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Mode</h3>
      <div className="grid grid-cols-2 gap-2">
        {(['single', 'seamless'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={`rounded-lg border px-3 py-2 text-sm capitalize transition ${
              settings.mode === mode
                ? 'border-accent bg-accent/15 text-white'
                : 'border-border bg-panel text-muted hover:bg-panel-hover'
            }`}
          >
            {mode === 'single' ? 'Single' : 'Seamless'}
          </button>
        ))}
      </div>
      {settings.mode === 'seamless' && (
        <p className="text-xs leading-relaxed text-muted">
          Design a wide canvas that slices into multiple App Store screenshots with elements spanning panel boundaries.
        </p>
      )}
    </section>
  );
}
