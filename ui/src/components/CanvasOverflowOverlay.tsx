import type { ScreenRect } from '../lib/placement-overflow';

interface CanvasOverflowOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  regions: ScreenRect[];
  active: boolean;
}

export function CanvasOverflowOverlay({
  canvasWidth,
  canvasHeight,
  regions,
  active,
}: CanvasOverflowOverlayProps) {
  if (!active || regions.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        className="absolute inset-0 overflow-flash-border"
        style={{
          boxShadow: 'inset 0 0 0 2px #ff2d2d',
        }}
      />

      {regions.map((region, i) => (
        <div
          key={i}
          className="absolute overflow-flash-fill"
          style={{
            left: region.left,
            top: region.top,
            width: region.width,
            height: region.height,
            backgroundColor: '#ff1a1a',
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
        }}
      />
    </div>
  );
}
