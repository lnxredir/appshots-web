import { getPhoneFrameMetrics } from '../lib/device-bounds';
import { resolveFrameColor, type DeviceFrameOptions } from '../lib/frame-colors';
import type { DeviceInfo, DevicePlacement } from '../types';

interface LiveDeviceFrameProps {
  placement: DevicePlacement;
  device: DeviceInfo;
  orientation: 'portrait' | 'landscape';
  panelWidth: number;
  panelHeight: number;
  wideW: number;
  imageRect: { x: number; y: number; width: number; height: number };
  frameOptions: DeviceFrameOptions;
  selected: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

export function LiveDeviceFrame({
  placement,
  device,
  orientation,
  panelWidth,
  panelHeight,
  wideW,
  imageRect,
  frameOptions,
  selected,
  isDragging,
  onPointerDown,
  onClick,
}: LiveDeviceFrameProps) {
  const showFrame = frameOptions.deviceFrame ?? true;
  const showShadow = frameOptions.shadow ?? true;
  const { body, ring } = resolveFrameColor(frameOptions.frameColor);
  const { phoneW, phoneH, bezel, bodyRadius, screenRadius } = getPhoneFrameMetrics(
    device,
    panelWidth,
    placement.width,
    orientation,
  );
  const scaleX = imageRect.width / wideW;
  const scaleY = imageRect.height / panelHeight;
  const w = phoneW * scaleX;
  const h = phoneH * scaleY;
  const left = placement.x * wideW * scaleX;
  const top = placement.y * panelHeight * scaleY;
  const bezelPx = bezel * scaleX;
  const bodyRadiusPx = bodyRadius * scaleX;
  const screenRadiusPx = screenRadius * scaleX;

  const shadowStyle = showShadow ? '0 16px 48px rgba(0,0,0,0.45)' : undefined;

  if (!showFrame) {
    return (
      <div
        className={`absolute touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${selected ? 'z-10' : 'z-[5]'}`}
        style={{
          left,
          top,
          width: w,
          height: h,
          transform: `rotate(${placement.rotation}deg)`,
          transformOrigin: 'center center',
          boxShadow: shadowStyle,
        }}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        <img
          src={placement.url}
          alt=""
          className="h-full w-full object-cover object-top"
          style={{ borderRadius: `${screenRadiusPx}px` }}
          draggable={false}
        />
        {selected && (
          <div
            className="pointer-events-none absolute inset-0 border-2 border-dashed border-accent"
            style={{ borderRadius: `${screenRadiusPx}px` }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`absolute touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${selected ? 'z-10' : 'z-[5]'}`}
      style={{
        left,
        top,
        width: w,
        height: h,
        transform: `rotate(${placement.rotation}deg)`,
        transformOrigin: 'center center',
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div
        className="h-full w-full"
        style={{
          backgroundColor: body,
          borderRadius: `${bodyRadiusPx}px`,
          padding: `${bezelPx}px`,
          boxShadow: shadowStyle,
          border: `1px solid ${ring}`,
        }}
      >
        <img
          src={placement.url}
          alt=""
          className="h-full w-full object-cover object-top"
          style={{ borderRadius: `${screenRadiusPx}px` }}
          draggable={false}
        />
      </div>
      {selected && (
        <div
          className="pointer-events-none absolute inset-0 border-2 border-dashed border-accent"
          style={{ borderRadius: `${bodyRadiusPx}px` }}
        />
      )}
    </div>
  );
}
