import { useState } from 'react';
import {
  applyTextAlign,
  computeDefaultTextPositions,
  resolveTextPositionsFromOptions,
  type TextAlignH,
  type TextAlignV,
} from '../lib/panel-text-layout';
import { TextStyleControls } from './TextStyleControls';
import type { CustomFont, FrameOptions, PanelTextStyle } from '../types';

function SizeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-muted">{label}</label>
        <span className="font-mono text-xs text-muted">{(value * 100).toFixed(1)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
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

interface TextStylingSectionProps {
  title: string;
  subtitle: string;
  options: Partial<FrameOptions>;
  customFonts: CustomFont[];
  panelWidth?: number;
  panelHeight?: number;
  onOptionsChange: (patch: Partial<PanelTextStyle>) => void;
  /** When false, content is always visible (no collapse toggle). */
  collapsible?: boolean;
}

export function TextStylingSection({
  title,
  subtitle,
  options,
  customFonts,
  panelWidth = 1000,
  panelHeight = 2000,
  onOptionsChange,
  collapsible = true,
}: TextStylingSectionProps) {
  const [expanded, setExpanded] = useState(!collapsible);
  const freePosition = !!options.freePosition;

  const setFreePosition = (enabled: boolean) => {
    if (!enabled) {
      onOptionsChange({
        freePosition: false,
        titleX: undefined,
        titleY: undefined,
        subtitleX: undefined,
        subtitleY: undefined,
        textAlignH: undefined,
        textAlignV: undefined,
      });
      return;
    }

    const defaults = computeDefaultTextPositions(panelWidth, panelHeight, title, subtitle, options);
    onOptionsChange({
      freePosition: true,
      titleX: defaults.titleX,
      titleY: defaults.titleY,
      subtitleX: defaults.subtitleX,
      subtitleY: defaults.subtitleY,
    });
  };

  const resetTextLayout = () => {
    const defaults = computeDefaultTextPositions(panelWidth, panelHeight, title, subtitle, options);
    onOptionsChange({
      titleX: defaults.titleX,
      titleY: defaults.titleY,
      subtitleX: defaults.subtitleX,
      subtitleY: defaults.subtitleY,
    });
  };

  const titleSize = options.titleSize ?? 0.087;
  const subtitleSize = options.subtitleSize ?? 0.043;

  const applyAlign = (alignH: TextAlignH | null, alignV: TextAlignV | null) => {
    if (!freePosition && alignH && !alignV) {
      onOptionsChange({ textAlignH: alignH });
      return;
    }

    if (!freePosition && alignV && !alignH) {
      onOptionsChange({
        textPosition: alignV === 'top' ? 'top' : 'bottom',
        textAlignV: alignV,
      });
      return;
    }

    const current = resolveTextPositionsFromOptions(
      panelWidth,
      panelHeight,
      title,
      subtitle,
      options,
    );
    const aligned = applyTextAlign(
      current,
      alignH,
      alignV,
      title,
      subtitle,
      panelWidth,
      panelHeight,
      options,
    );
    onOptionsChange({
      freePosition: true,
      ...(alignH ? { textAlignH: alignH } : {}),
      ...(alignV ? { textAlignV: alignV } : {}),
      ...aligned,
    });
  };

  const content = (
    <div className="space-y-3">
      <Toggle label="Free positioning" checked={freePosition} onChange={setFreePosition} />

      {freePosition && (
        <>
          <Toggle
            label="Grid align"
            checked={options.textGridAlign ?? false}
            onChange={(textGridAlign) => onOptionsChange({ textGridAlign })}
          />
          <button
            type="button"
            onClick={resetTextLayout}
            className="w-full rounded-lg border border-border bg-[#0e0e14] px-2 py-1.5 text-xs text-muted transition hover:bg-panel-hover hover:text-white"
          >
            Reset text layout
          </button>
        </>
      )}

      {!freePosition && (
        <div className="grid grid-cols-2 gap-2">
          {(['bottom', 'top'] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => onOptionsChange({ textPosition: pos })}
              className={`rounded-lg border px-2 py-1.5 text-xs capitalize transition ${
                (options.textPosition ?? 'bottom') === pos
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-border bg-[#0e0e14] text-muted hover:bg-panel-hover'
              }`}
            >
              Text {pos}
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Horizontal align</label>
        <div className="grid grid-cols-3 gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => applyAlign(align, null)}
              className={`rounded-lg border px-2 py-1.5 text-xs capitalize transition ${
                options.textAlignH === align
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-border bg-[#0e0e14] hover:bg-panel-hover hover:text-white'
              }`}
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
              className={`rounded-lg border px-2 py-1.5 text-xs capitalize transition ${
                options.textAlignV === align
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-border bg-[#0e0e14] hover:bg-panel-hover hover:text-white'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <SizeSlider
        label="Title size"
        value={titleSize}
        min={0.04}
        max={0.15}
        step={0.002}
        onChange={(v) => onOptionsChange({ titleSize: v })}
      />
      <SizeSlider
        label="Subtitle size"
        value={subtitleSize}
        min={0.02}
        max={0.08}
        step={0.001}
        onChange={(v) => onOptionsChange({ subtitleSize: v })}
      />

      <TextStyleControls
        role="title"
        label="Title style"
        options={options}
        customFonts={customFonts}
        onOptionsChange={onOptionsChange}
      />
      <TextStyleControls
        role="subtitle"
        label="Subtitle style"
        options={options}
        customFonts={customFonts}
        defaultCollapsed
        onOptionsChange={onOptionsChange}
      />
    </div>
  );

  if (!collapsible) {
    return content;
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-1.5 text-left text-xs font-medium text-muted transition hover:text-white"
        aria-expanded={expanded}
      >
        <span>Text styling</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 transition ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && <div className="mt-2">{content}</div>}
    </div>
  );
}
