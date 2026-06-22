import { useRef } from 'react';
import { familyFromFilename, isFontFile } from '../lib/custom-fonts';
import type { CustomFont } from '../types';

interface CustomFontControlsProps {
  fonts: CustomFont[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
}

function createFontId(): string {
  return `font_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createCustomFontFromFile(file: File): CustomFont {
  const family = familyFromFilename(file.name);
  return {
    id: createFontId(),
    file,
    url: URL.createObjectURL(file),
    name: family,
    family,
  };
}

export function CustomFontControls({ fonts, onAdd, onRemove }: CustomFontControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted">Custom fonts</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-border bg-panel px-2.5 py-1 text-xs text-muted transition hover:bg-panel-hover hover:text-white"
        >
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAdd(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {fonts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-panel px-3 py-2 text-xs text-muted">
          Upload .woff, .woff2, .ttf, or .otf files
        </p>
      ) : (
        <ul className="space-y-1.5">
          {fonts.map((font) => (
            <li
              key={font.id}
              className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2"
            >
              <span
                className="truncate text-sm"
                style={{ fontFamily: `'${font.family}', sans-serif` }}
              >
                {font.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(font.id)}
                className="ml-2 shrink-0 text-xs text-muted transition hover:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function filterFontFiles(files: FileList): File[] {
  return Array.from(files).filter(isFontFile);
}
