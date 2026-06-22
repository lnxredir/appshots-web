import type { FrameSettings } from '../types';
import { FRAME_COLORS, GRADIENT_PRESETS, PATTERNS } from '../types';
import { DeviceSelect } from './DeviceSelect';
import { CustomFontControls } from './CustomFontControls';
import { IconControls } from './IconControls';
import { StickerControls } from './StickerControls';
import { TextStylingSection } from './TextStylingSection';
import type { CustomFont, DeviceInfo, Sticker } from '../types';
import type { IconPackId } from '../lib/icons';

interface FrameControlsProps {
  devices: DeviceInfo[];
  settings: FrameSettings;
  customFonts: CustomFont[];
  stickers: Sticker[];
  selectedStickerId: string | null;
  onCustomFontsAdd: (files: FileList) => void;
  onCustomFontRemove: (id: string) => void;
  onStickersAdd: (files: FileList) => void;
  onStickerUpdate: (id: string, patch: Partial<Sticker>) => void;
  onStickerRemove: (id: string) => void;
  onStickerSelect: (id: string | null) => void;
  onStickerInteractionStart?: () => void;
  onStickerInteractionEnd?: () => void;
  onAddIcon: (iconName: string, pack: IconPackId, color: string) => void;
  onChange: (settings: FrameSettings) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
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

export function FrameControls({
  devices,
  settings,
  customFonts,
  stickers,
  selectedStickerId,
  onCustomFontsAdd,
  onCustomFontRemove,
  onStickersAdd,
  onStickerUpdate,
  onStickerRemove,
  onStickerSelect,
  onStickerInteractionStart,
  onStickerInteractionEnd,
  onAddIcon,
  onChange,
}: FrameControlsProps) {
  const update = (patch: Partial<FrameSettings>) => onChange({ ...settings, ...patch });
  const updateOptions = (patch: Partial<FrameSettings['options']>) =>
    onChange({ ...settings, options: { ...settings.options, ...patch } });

  const selectedDevice = devices.find((d) => d.slug === settings.device);
  const panelWidth = selectedDevice
    ? settings.orientation === 'portrait'
      ? selectedDevice.width
      : selectedDevice.height
    : 1320;
  const panelHeight = selectedDevice
    ? settings.orientation === 'portrait'
      ? selectedDevice.height
      : selectedDevice.width
    : 2868;

  return (
    <div className="space-y-6">
      <Section title="Device">
        <DeviceSelect
          devices={devices}
          value={settings.device}
          onChange={(device) => update({ device })}
        />
        <div className="grid grid-cols-2 gap-2">
          {(['portrait', 'landscape'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => update({ orientation: o })}
              className={`rounded-lg border px-3 py-2 text-sm capitalize transition ${
                settings.orientation === o
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-border bg-panel text-muted hover:bg-panel-hover'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </Section>

      {settings.mode === 'single' && (
        <Section title="Text">
          <CustomFontControls fonts={customFonts} onAdd={onCustomFontsAdd} onRemove={onCustomFontRemove} />

          <StickerControls
            stickers={stickers}
            selectedId={selectedStickerId}
            onAdd={onStickersAdd}
            onUpdate={onStickerUpdate}
            onRemove={onStickerRemove}
            onSelect={onStickerSelect}
            onInteractionStart={onStickerInteractionStart}
            onInteractionEnd={onStickerInteractionEnd}
          />

          <IconControls onAddIcon={onAddIcon} />

          <div className="rounded-xl border border-border bg-panel p-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Your App Name"
                className="mb-2 w-full rounded-lg border border-border bg-[#0e0e14] px-3 py-2 text-sm outline-none transition focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Subtitle</label>
              <input
                type="text"
                value={settings.subtitle}
                onChange={(e) => update({ subtitle: e.target.value })}
                placeholder="Your tagline here"
                className="w-full rounded-lg border border-border bg-[#0e0e14] px-3 py-2 text-sm outline-none transition focus:border-accent"
              />
            </div>
            <TextStylingSection
              title={settings.title}
              subtitle={settings.subtitle}
              options={settings.options}
              customFonts={customFonts}
              panelWidth={panelWidth}
              panelHeight={panelHeight}
              onOptionsChange={updateOptions}
            />
          </div>
        </Section>
      )}

      <Section title="Background">
        <div className="grid grid-cols-4 gap-2">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              title={preset.label}
              onClick={() => updateOptions({ background: preset.value })}
              className={`aspect-square rounded-lg border-2 transition hover:scale-105 ${
                settings.options.background === preset.value
                  ? 'border-white ring-2 ring-accent'
                  : 'border-transparent'
              }`}
              style={{
                background: preset.value.includes('gradient') ? preset.value : preset.value,
              }}
            />
          ))}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Custom CSS color or gradient</label>
          <input
            type="text"
            value={settings.options.background ?? ''}
            onChange={(e) => updateOptions({ background: e.target.value })}
            className="w-full rounded-lg border border-border bg-panel px-3 py-2.5 font-mono text-xs outline-none transition focus:border-accent"
          />
        </div>
      </Section>

      <Section title="Device frame">
        <Toggle
          label="Show device bezel"
          checked={settings.options.deviceFrame ?? true}
          onChange={(v) => updateOptions({ deviceFrame: v })}
        />
        <Toggle
          label="Drop shadow"
          checked={settings.options.shadow ?? true}
          onChange={(v) => updateOptions({ shadow: v })}
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Frame color</label>
          <div className="grid grid-cols-3 gap-2">
            {FRAME_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => updateOptions({ frameColor: c.value })}
                className={`rounded-lg border px-2 py-2 text-xs transition ${
                  settings.options.frameColor === c.value
                    ? 'border-accent bg-accent/15'
                    : 'border-border bg-panel hover:bg-panel-hover'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Pattern">
        <select
          value={settings.options.pattern ?? ''}
          onChange={(e) => updateOptions({ pattern: e.target.value || undefined })}
          className="w-full rounded-lg border border-border bg-panel px-3 py-2.5 text-sm outline-none transition focus:border-accent"
        >
          {PATTERNS.map((p) => (
            <option key={p.label} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {settings.options.pattern && (
          <div>
            <label className="mb-1.5 flex justify-between text-xs font-medium text-muted">
              <span>Pattern opacity</span>
              <span>{Math.round((settings.options.patternOpacity ?? 0.1) * 100)}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.options.patternOpacity ?? 0.1}
              onChange={(e) => updateOptions({ patternOpacity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        )}
      </Section>
    </div>
  );
}
