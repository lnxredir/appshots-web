import { useEffect, useMemo, useState } from 'react';
import {
  getIconPackCount,
  iconDisplayName,
  iconToSvg,
  ICON_PACKS,
  searchIcons,
  type IconPackId,
} from '../lib/icons';

interface IconControlsProps {
  onAddIcon: (iconName: string, pack: IconPackId, color: string) => void;
}

function IconPreview({ iconName, pack, color }: { iconName: string; pack: IconPackId; color: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    iconToSvg(iconName, color, 24, pack).then((svg) => {
      if (cancelled || !svg) return;
      setSrc(`data:image/svg+xml,${encodeURIComponent(svg)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [iconName, pack, color]);

  if (!src) {
    return <div className="h-6 w-6 rounded bg-white/5" />;
  }

  return <img src={src} alt="" className="h-6 w-6" draggable={false} />;
}

export function IconControls({ onAddIcon }: IconControlsProps) {
  const [query, setQuery] = useState('');
  const [pack, setPack] = useState<IconPackId>('lucide');
  const [color, setColor] = useState('#ffffff');
  const [results, setResults] = useState<string[]>([]);
  const [iconCount, setIconCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([searchIcons(query, pack, 60), getIconPackCount(pack)]).then(([icons, count]) => {
      if (cancelled) return;
      setResults(icons);
      setIconCount(count);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query, pack]);

  const emptyLabel = useMemo(() => {
    if (loading) return 'Loading icons…';
    return 'No icons match your search';
  }, [loading]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Icons</h3>
        <span className="text-[10px] text-muted">{iconCount} icons</span>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Icon pack</label>
        <select
          value={pack}
          onChange={(e) => setPack(e.target.value as IconPackId)}
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none transition focus:border-accent"
        >
          {ICON_PACKS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Search icons</label>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. star, camera, heart"
          className="w-full rounded-lg border border-border bg-[#0e0e14] px-3 py-2 text-sm outline-none transition focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Icon color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-panel"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-panel px-3 py-2 font-mono text-xs outline-none transition focus:border-accent"
          />
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-[#0e0e14] p-2">
        {results.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted">{emptyLabel}</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {results.map((iconName) => (
              <button
                key={iconName}
                type="button"
                title={iconDisplayName(iconName, pack)}
                onClick={() => onAddIcon(iconName, pack, color)}
                className="flex flex-col items-center gap-1 rounded-lg border border-transparent px-1 py-2 text-center transition hover:border-accent/40 hover:bg-panel-hover"
              >
                <IconPreview iconName={iconName} pack={pack} color={color} />
                <span className="line-clamp-2 text-[9px] leading-tight text-muted">
                  {iconDisplayName(iconName, pack)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] leading-snug text-muted">
        Click an icon to add it to the preview. Drag to move, use the corner handle to resize, and right-click for layer and delete options.
      </p>
    </section>
  );
}
