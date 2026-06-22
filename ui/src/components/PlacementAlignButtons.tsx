type AlignH = 'left' | 'center' | 'right';
type AlignV = 'top' | 'middle' | 'bottom';

interface PlacementAlignButtonsProps {
  onAlignH: (align: AlignH) => void;
  onAlignV: (align: AlignV) => void;
}

export function PlacementAlignButtons({ onAlignH, onAlignV }: PlacementAlignButtonsProps) {
  return (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Horizontal align</label>
        <div className="grid grid-cols-3 gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => onAlignH(align)}
              className="rounded-lg border border-border bg-[#0e0e14] px-2 py-2 text-xs capitalize transition hover:bg-panel-hover hover:text-white"
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
              onClick={() => onAlignV(align)}
              className="rounded-lg border border-border bg-[#0e0e14] px-2 py-2 text-xs capitalize transition hover:bg-panel-hover hover:text-white"
            >
              {align}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
