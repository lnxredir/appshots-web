import { useState } from 'react';
import { resolveFontCss } from '../lib/custom-fonts';
import type { CustomFont, FrameOptions } from '../types';
import { FONT_FAMILIES } from '../types';

type TextRole = 'title' | 'subtitle';

interface TextStyleControlsProps {
  role: TextRole;
  label: string;
  options: Partial<FrameOptions>;
  customFonts: CustomFont[];
  defaultCollapsed?: boolean;
  onOptionsChange: (patch: Partial<FrameOptions>) => void;
}

const EFFECTS: { key: string; label: string }[] = [
  { key: 'Bold', label: 'Bold' },
  { key: 'Italic', label: 'Italic' },
  { key: 'Underline', label: 'Underline' },
  { key: 'Strikethrough', label: 'Strike' },
  { key: 'Uppercase', label: 'Uppercase' },
  { key: 'Shadow', label: 'Shadow' },
];

function roleKey(role: TextRole, suffix: string): keyof FrameOptions {
  return `${role}${suffix}` as keyof FrameOptions;
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hexMatch = value.match(/^#([0-9a-f]{3,8})$/i);
  const pickerValue = hexMatch ? value.slice(0, 7) : '#ffffff';

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-panel"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-panel px-3 py-2 font-mono text-xs outline-none transition focus:border-accent"
        />
      </div>
    </div>
  );
}

function EffectToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-accent bg-accent/20 text-white'
          : 'border-border bg-panel text-muted hover:bg-panel-hover hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

export function TextStyleControls({
  role,
  label,
  options,
  customFonts,
  defaultCollapsed = false,
  onOptionsChange,
}: TextStyleControlsProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const font = (options[roleKey(role, 'Font')] as string | undefined) ?? 'Inter';
  const color = (options[roleKey(role, 'Color')] as string | undefined) ?? '#ffffff';
  const letterSpacing =
    (options[roleKey(role, 'LetterSpacing')] as number | undefined) ??
    (role === 'title' ? 0.08 : 0.01);

  const effects = EFFECTS.map((e) => ({
    ...e,
    roleKey: roleKey(role, e.key),
  }));

  const fontCss = resolveFontCss(font, customFonts);
  const fontLabel =
    font.startsWith('custom:')
      ? customFonts.find((f) => f.id === font.slice(7))?.name ?? 'Custom font'
      : font;

  return (
    <div className="rounded-xl border border-border bg-[#0e0e14]">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-panel-hover"
        aria-expanded={!collapsed}
      >
        <div className="min-w-0">
          <h4 className="text-sm font-medium">{label}</h4>
          {collapsed && (
            <p className="mt-0.5 truncate text-xs text-muted" style={{ fontFamily: fontCss }}>
              {fontLabel} · {color}
            </p>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-muted transition ${collapsed ? '' : 'rotate-180'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Font</label>
            <select
              value={font}
              onChange={(e) => onOptionsChange({ [roleKey(role, 'Font')]: e.target.value })}
              className="w-full rounded-lg border border-border bg-panel px-3 py-2.5 text-sm outline-none transition focus:border-accent"
              style={{ fontFamily: fontCss }}
            >
              {customFonts.length > 0 && (
                <optgroup label="Custom">
                  {customFonts.map((f) => (
                    <option
                      key={f.id}
                      value={`custom:${f.id}`}
                      style={{ fontFamily: `'${f.family}', sans-serif` }}
                    >
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Built-in">
                {FONT_FAMILIES.map((f) => (
                  <option
                    key={f}
                    value={f}
                    style={{ fontFamily: f === 'System UI' ? 'system-ui' : `'${f}', sans-serif` }}
                  >
                    {f}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <ColorInput
            label="Color"
            value={color}
            onChange={(v) => onOptionsChange({ [roleKey(role, 'Color')]: v })}
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Effects</label>
            <div className="flex flex-wrap gap-1.5">
              {effects.map((effect) => {
                const active = Boolean(options[effect.roleKey]);
                return (
                  <EffectToggle
                    key={effect.label}
                    label={effect.label}
                    active={active}
                    onClick={() => onOptionsChange({ [effect.roleKey]: !active })}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex justify-between text-xs font-medium text-muted">
              <span>Letter spacing</span>
              <span>{Math.round(letterSpacing * 100)}%</span>
            </label>
            <input
              type="range"
              min={-0.02}
              max={0.2}
              step={0.01}
              value={letterSpacing}
              onChange={(e) =>
                onOptionsChange({ [roleKey(role, 'LetterSpacing')]: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
