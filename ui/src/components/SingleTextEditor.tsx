import { useEffect, useRef } from 'react';
import { resolveFontCss } from '../lib/custom-fonts';
import { applyTextAlign, resolveTextPositionsFromOptions, textElementId } from '../lib/panel-text-layout';
import { CustomFontControls } from './CustomFontControls';
import type { CustomFont, FrameOptions } from '../types';
import { FONT_FAMILIES } from '../types';

type TextRole = 'title' | 'subtitle';

interface SingleTextEditorProps {
  title: string;
  subtitle: string;
  options: Partial<FrameOptions>;
  customFonts: CustomFont[];
  panelWidth: number;
  panelHeight: number;
  selectedTextId: string | null;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onOptionsChange: (patch: Partial<FrameOptions>) => void;
  onTextSelect: (id: string | null) => void;
  onCustomFontsAdd: (files: FileList) => void;
  onCustomFontRemove: (id: string) => void;
}

function roleKey(role: TextRole, suffix: string): keyof FrameOptions {
  return `${role}${suffix}` as keyof FrameOptions;
}

function activeRole(selectedTextId: string | null): TextRole {
  if (selectedTextId?.endsWith('-subtitle')) return 'subtitle';
  return 'title';
}

function ToolbarButton({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className={`min-w-[2rem] rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-accent bg-accent/20 text-white'
          : 'border-border bg-[#0e0e14] text-muted hover:bg-panel-hover hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function AlignButton({
  align,
  active,
  onClick,
}: {
  align: 'left' | 'center' | 'right';
  active: boolean;
  onClick: () => void;
}) {
  const paths = {
    left: <line x1="4" y1="6" x2="20" y2="6" />,
    center: (
      <>
        <line x1="6" y1="6" x2="18" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="6" y1="18" x2="18" y2="18" />
      </>
    ),
    right: <line x1="4" y1="6" x2="20" y2="6" />,
  };

  return (
    <button
      type="button"
      title={`Align ${align}`}
      onClick={onClick}
      className={`rounded-md border p-2 transition ${
        active
          ? 'border-accent bg-accent/20 text-white'
          : 'border-border bg-[#0e0e14] text-muted hover:bg-panel-hover hover:text-white'
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={align === 'right' ? 'ml-auto block' : align === 'center' ? 'mx-auto block' : 'block'}
      >
        {paths[align]}
      </svg>
    </button>
  );
}

export function SingleTextEditor({
  title,
  subtitle,
  options,
  customFonts,
  panelWidth,
  panelHeight,
  selectedTextId,
  onTitleChange,
  onSubtitleChange,
  onOptionsChange,
  onTextSelect,
  onCustomFontsAdd,
  onCustomFontRemove,
}: SingleTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const role = activeRole(selectedTextId);
  const content = role === 'title' ? title : subtitle;

  useEffect(() => {
    textareaRef.current?.focus();
  }, [role, selectedTextId]);

  const font = (options[roleKey(role, 'Font')] as string | undefined) ?? 'Inter';
  const color = (options[roleKey(role, 'Color')] as string | undefined) ?? '#ffffff';
  const fontSize = role === 'title' ? (options.titleSize ?? 0.087) : (options.subtitleSize ?? 0.043);
  const letterSpacing =
    (options[roleKey(role, 'LetterSpacing')] as number | undefined) ??
    (role === 'title' ? 0.08 : 0.01);
  const alignH = options.textAlignH ?? 'center';
  const fontCss = resolveFontCss(font, customFonts);

  const setContent = (value: string) => {
    if (role === 'title') onTitleChange(value);
    else onSubtitleChange(value);
  };

  const setRole = (next: TextRole) => {
    onTextSelect(textElementId(0, next));
  };

  const toggleOption = (suffix: string) => {
    const key = roleKey(role, suffix);
    onOptionsChange({ [key]: !options[key] });
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    const current = resolveTextPositionsFromOptions(panelWidth, panelHeight, title, subtitle, options);
    const aligned = applyTextAlign(
      current,
      align,
      null,
      title,
      subtitle,
      panelWidth,
      panelHeight,
      options,
    );
    onOptionsChange({
      freePosition: true,
      textAlignH: align,
      ...aligned,
    });
  };

  const setFontSize = (value: number) => {
    onOptionsChange(role === 'title' ? { titleSize: value } : { subtitleSize: value });
  };

  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  const pickerValue = hexMatch ? color.slice(0, 7) : '#ffffff';

  return (
    <div className="space-y-3">
      <CustomFontControls fonts={customFonts} onAdd={onCustomFontsAdd} onRemove={onCustomFontRemove} />

      <div className="rounded-xl border border-border bg-panel">
        <div className="flex border-b border-border">
          {(['title', 'subtitle'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRole(tab)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium capitalize transition ${
                role === tab
                  ? 'border-b-2 border-accent text-white'
                  : 'text-muted hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3 p-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => onTextSelect(textElementId(0, role))}
            placeholder={role === 'title' ? 'Your App Name' : 'Your tagline here'}
            rows={4}
            className="w-full resize-y rounded-lg border border-border bg-[#0e0e14] px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-accent"
            style={{ fontFamily: fontCss }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={font}
              onChange={(e) => onOptionsChange({ [roleKey(role, 'Font')]: e.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-border bg-[#0e0e14] px-2 py-1.5 text-xs outline-none transition focus:border-accent"
              style={{ fontFamily: fontCss }}
            >
              {customFonts.length > 0 && (
                <optgroup label="Custom">
                  {customFonts.map((f) => (
                    <option key={f.id} value={`custom:${f.id}`}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Built-in">
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </optgroup>
            </select>

            <input
              type="color"
              value={pickerValue}
              onChange={(e) => onOptionsChange({ [roleKey(role, 'Color')]: e.target.value })}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border bg-[#0e0e14]"
              title="Text color"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>Size</span>
              <span className="font-mono">{(fontSize * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={role === 'title' ? 0.03 : 0.015}
              max={role === 'title' ? 0.2 : 0.12}
              step={0.001}
              value={fontSize}
              onChange={(e) => setFontSize(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <ToolbarButton label="B" active={!!options[roleKey(role, 'Bold')]} onClick={() => toggleOption('Bold')} title="Bold" />
            <ToolbarButton label="I" active={!!options[roleKey(role, 'Italic')]} onClick={() => toggleOption('Italic')} title="Italic" />
            <ToolbarButton label="U" active={!!options[roleKey(role, 'Underline')]} onClick={() => toggleOption('Underline')} title="Underline" />
            <ToolbarButton label="S" active={!!options[roleKey(role, 'Strikethrough')]} onClick={() => toggleOption('Strikethrough')} title="Strikethrough" />
            <ToolbarButton label="Aa" active={!!options[roleKey(role, 'Uppercase')]} onClick={() => toggleOption('Uppercase')} title="Uppercase" />
            <ToolbarButton label="◐" active={!!options[roleKey(role, 'Shadow')]} onClick={() => toggleOption('Shadow')} title="Drop shadow" />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <AlignButton align="left" active={alignH === 'left'} onClick={() => setAlign('left')} />
            <AlignButton align="center" active={alignH === 'center'} onClick={() => setAlign('center')} />
            <AlignButton align="right" active={alignH === 'right'} onClick={() => setAlign('right')} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>Letter spacing</span>
              <span>{Math.round(letterSpacing * 100)}%</span>
            </div>
            <input
              type="range"
              min={-0.02}
              max={0.2}
              step={0.01}
              value={letterSpacing}
              onChange={(e) =>
                onOptionsChange({ [roleKey(role, 'LetterSpacing')]: parseFloat(e.target.value) })
              }
              className="w-full accent-accent"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-[#0e0e14] px-3 py-2 text-xs text-muted transition hover:text-white">
            <span>Snap text to grid</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!options.textGridAlign}
              onClick={() => onOptionsChange({ textGridAlign: !options.textGridAlign })}
              className={`relative h-5 w-9 rounded-full transition ${options.textGridAlign ? 'bg-accent' : 'bg-border'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition ${options.textGridAlign ? 'translate-x-4' : ''}`}
              />
            </button>
          </label>
        </div>
      </div>

      <p className="text-xs text-muted">
        Drag text on the preview to reposition. Select a block and drag its corner to resize the text box.
      </p>
    </div>
  );
}
