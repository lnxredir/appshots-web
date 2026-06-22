import type { DeviceInfo } from '../types';

interface DeviceSelectProps {
  devices: DeviceInfo[];
  value: string;
  onChange: (slug: string) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  macos: 'macOS',
  watchos: 'watchOS',
  tvos: 'tvOS',
  visionos: 'visionOS',
};

export function DeviceSelect({ devices, value, onChange }: DeviceSelectProps) {
  const grouped = devices.reduce<Record<string, DeviceInfo[]>>((acc, d) => {
    (acc[d.platform] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted">Device preset</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-panel px-3 py-2.5 text-sm outline-none transition focus:border-accent"
      >
        {Object.entries(grouped).map(([platform, list]) => (
          <optgroup key={platform} label={PLATFORM_LABELS[platform] ?? platform}>
            {list.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name} — {d.width}×{d.height}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
