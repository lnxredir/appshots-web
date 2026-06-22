import { getGridDimensions } from '../lib/screenshot-placement';

interface PlacementGridProps {
  canvasWidth: number;
  canvasHeight: number;
}

export function PlacementGrid({ canvasWidth, canvasHeight }: PlacementGridProps) {
  const { cols, rows } = getGridDimensions(canvasWidth, canvasHeight);

  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: cols - 1 }, (_, i) => {
        const x = ((i + 1) / cols) * 100;
        return (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 w-px bg-white/20"
            style={{ left: `${x}%` }}
          />
        );
      })}
      {Array.from({ length: rows - 1 }, (_, i) => {
        const y = ((i + 1) / rows) * 100;
        return (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 h-px bg-white/20"
            style={{ top: `${y}%` }}
          />
        );
      })}
    </div>
  );
}
