import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createCustomFontFromFile, filterFontFiles } from './components/CustomFontControls';
import {
  DevicePlacementControls,
  loadDeviceFromFile,
} from './components/DevicePlacementControls';
import { FrameControls } from './components/FrameControls';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ModeSelector } from './components/ModeSelector';
import { PreviewPanel } from './components/PreviewPanel';
import { ScreenshotPlacementControls } from './components/ScreenshotPlacementControls';
import { SeamlessPanelEditor } from './components/SeamlessPanelEditor';
import { SeamlessPreviewPanel } from './components/SeamlessPreviewPanel';
import type { DraggableElement } from './components/SeamlessPreviewPanel';
import { UploadZone } from './components/UploadZone';
import { useDebounce } from './hooks/useDebounce';
import { usePreviewHold } from './hooks/usePreviewHold';
import { fetchDevices, frameImage, frameSeamlessImage, markSeamlessUploadsCached, SEAMLESS_PREVIEW_SCALE } from './lib/api';
import { exportSeamlessPanels } from './lib/seamless-export';
import { exportSingleImage } from './lib/single-export';
import { placementFromOptions } from './lib/screenshot-placement';
import { APP_VERSION } from './lib/version';
import { injectCustomFonts } from './lib/custom-fonts';
import { createIconSticker, type IconPackId } from './lib/icons';
import { getDefaultScreenshotPlacement, placementToPatch } from './lib/screenshot-placement';
import { parseTextElementId } from './lib/panel-text-layout';
import {
  DEFAULT_SETTINGS,
  type CustomFont,
  type DeviceInfo,
  type DevicePlacement,
  type FrameSettings,
  type OverlayLayer,
  type SeamlessPanelConfig,
  type Sticker,
} from './types';

function createStickerId(): string {
  return `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadStickerFromFile(file: File, index: number, wideRatio = 1): Promise<Sticker> {
  const url = URL.createObjectURL(file);
  const aspectRatio = await new Promise<number>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalHeight / img.naturalWidth);
    img.onerror = () => resolve(1);
    img.src = url;
  });

  return {
    id: createStickerId(),
    file,
    url,
    name: file.name,
    x: (0.1 + (index % 3) * 0.05) / wideRatio,
    y: 0.08 + Math.floor(index / 3) * 0.08,
    width: 0.15 / wideRatio,
    aspectRatio,
    layer: 'foreground',
    source: 'upload',
  };
}

export default function App() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<FrameSettings>(DEFAULT_SETTINGS);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [devicePlacements, setDevicePlacements] = useState<DevicePlacement[]>([]);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modeSwitchPending, setModeSwitchPending] = useState<{
    targetMode: 'single' | 'seamless';
    preservedFile: File;
  } | null>(null);
  const renderAbortRef = useRef<AbortController | null>(null);
  const cachedUploadFieldsRef = useRef(new Set<string>());
  const { held: previewHeld, hold: holdPreview, release: releasePreview } = usePreviewHold();

  const debouncedSettings = useDebounce(settings, 400);
  const debouncedCustomFonts = useDebounce(customFonts, 400);

  const isSeamless = settings.mode === 'seamless';

  const selectedDevice = useMemo(
    () => devices.find((d) => d.slug === settings.device),
    [devices, settings.device],
  );

  useEffect(() => {
    fetchDevices().then(setDevices).catch(console.error);
  }, []);

  useEffect(() => injectCustomFonts(customFonts), [customFonts]);

  useEffect(() => {
    if (!file) {
      setScreenshotUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setScreenshotUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const placementResetKey = `${file?.name ?? ''}:${selectedDevice?.slug ?? ''}:${settings.orientation}:${settings.options.textPosition ?? 'bottom'}`;
  const prevPlacementKeyRef = useRef('');

  useEffect(() => {
    if (!file || !selectedDevice) return;
    if (prevPlacementKeyRef.current === placementResetKey) return;
    prevPlacementKeyRef.current = placementResetKey;

    setSettings((prev) => {
      const defaults = getDefaultScreenshotPlacement(
        selectedDevice,
        prev.orientation,
        prev.options.textPosition ?? 'bottom',
      );
      return {
        ...prev,
        options: {
          ...prev.options,
          ...placementToPatch(defaults),
        },
      };
    });
  }, [file, selectedDevice, placementResetKey]);

  useEffect(() => {
    return () => {
      stickers.forEach((s) => URL.revokeObjectURL(s.url));
      customFonts.forEach((f) => URL.revokeObjectURL(f.url));
      devicePlacements.forEach((d) => URL.revokeObjectURL(d.url));
    };
  }, []);

  const canvasSize = useMemo(() => {
    if (!selectedDevice) return { width: 1320, height: 2868 };
    const { width, height } = selectedDevice;
    return settings.orientation === 'portrait'
      ? { width, height }
      : { width: height, height: width };
  }, [selectedDevice, settings.orientation]);

  const dimensions = isSeamless
    ? `${settings.panelCount}× ${canvasSize.width}×${canvasSize.height}`
    : `${canvasSize.width}×${canvasSize.height}`;

  const renderPreview = useCallback(async () => {
    if (isSeamless) {
      if (devicePlacements.length === 0) {
        setPreviewUrl(null);
        setError(null);
        return;
      }

      renderAbortRef.current?.abort();
      const controller = new AbortController();
      renderAbortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const result = await frameSeamlessImage(
          debouncedSettings,
          devicePlacements,
          stickers,
          debouncedCustomFonts,
          {
            previewScale: SEAMLESS_PREVIEW_SCALE,
            includeDevices: false,
            includeText: false,
            cachedUploadFields: cachedUploadFieldsRef.current,
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) return;
        markSeamlessUploadsCached(
          cachedUploadFieldsRef.current,
          devicePlacements,
          stickers,
          debouncedCustomFonts,
        );
        const url = URL.createObjectURL(result.wide);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to render preview');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
      return;
    }

    if (!file) {
      setPreviewUrl(null);
      setError(null);
      return;
    }

    renderAbortRef.current?.abort();
    const controller = new AbortController();
    renderAbortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const useLiveDevice =
        (debouncedSettings.options.deviceFrame ?? true) && !!selectedDevice;
      const hasText = !!(debouncedSettings.title || debouncedSettings.subtitle);
      const blob = await frameImage(
        file,
        debouncedSettings,
        stickers,
        debouncedCustomFonts,
        {
          includeDevice: !useLiveDevice,
          includeText: !hasText,
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to render preview');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [
    isSeamless,
    file,
    debouncedSettings,
    stickers,
    debouncedCustomFonts,
    devicePlacements,
    selectedDevice,
  ]);

  useEffect(() => {
    if (previewHeld) return;
    renderPreview();
  }, [previewHeld, renderPreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleAddStickers = async (files: FileList) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const wideRatio = isSeamless ? settings.panelCount : 1;
    const newStickers = await Promise.all(
      imageFiles.map((f, i) => loadStickerFromFile(f, stickers.length + i, wideRatio)),
    );
    setStickers((prev) => [...prev, ...newStickers]);
    if (newStickers[0]) setSelectedStickerId(newStickers[0].id);
  };

  const handleAddIcon = async (iconName: string, pack: IconPackId, color: string) => {
    const wideRatio = isSeamless ? settings.panelCount : 1;
    const index = stickers.length;
    const icon = await createIconSticker({
      iconPack: pack,
      iconName,
      iconColor: color,
      x: 0.1 + (index % 4) * 0.06,
      y: 0.1 + Math.floor(index / 4) * 0.08,
      width: 0.08,
      wideRatio,
    });
    setStickers((prev) => [...prev, icon]);
    setSelectedStickerId(icon.id);
  };

  const handleStickerResize = (id: string, width: number) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, width } : s)));
  };

  const handleStickerLayerChange = (id: string, layer: OverlayLayer) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, layer } : s)));
  };

  const handleStickerRemove = (id: string) => {
    setStickers((prev) => {
      const removed = prev.find((s) => s.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((s) => s.id !== id);
    });
    cachedUploadFieldsRef.current.delete(`sticker_${id}`);
    if (selectedStickerId === id) setSelectedStickerId(null);
  };

  const handleAddDevices = async (files: FileList) => {
    if (!selectedDevice) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const added = await Promise.all(
      imageFiles.map((f) =>
        loadDeviceFromFile(f, settings.panelCount, selectedDevice, settings.orientation),
      ),
    );
    setDevicePlacements((prev) => [...prev, ...added]);
    if (added[0]) setSelectedDeviceId(added[0].id);
  };

  const handlePanelCountChange = (count: number) => {
    setSettings((prev) => {
      const panels = [...prev.panels];
      while (panels.length < count) panels.push({ title: '', subtitle: '' });
      return { ...prev, panelCount: count, panels: panels.slice(0, count) };
    });
  };

  const handlePanelChange = (index: number, patch: Partial<SeamlessPanelConfig>) => {
    setSettings((prev) => {
      const panels = [...prev.panels];
      panels[index] = { ...panels[index], ...patch };
      return { ...prev, panels };
    });
  };

  const handleSeamlessElementMove = (id: string, x: number, y: number) => {
    if (devicePlacements.some((d) => d.id === id)) {
      setDevicePlacements((prev) => prev.map((d) => (d.id === id ? { ...d, x, y } : d)));
      return;
    }
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  const handleTextMove = (id: string, localX: number, localY: number) => {
    const meta = parseTextElementId(id);
    if (!meta) return;

    if (settings.mode === 'single') {
      setSettings((prev) => ({
        ...prev,
        options: {
          ...prev.options,
          freePosition: true,
          textAlignH: undefined,
          textAlignV: undefined,
          ...(meta.role === 'title'
            ? { titleX: localX, titleY: localY }
            : { subtitleX: localX, subtitleY: localY }),
        },
      }));
      return;
    }

    setSettings((prev) => {
      const panels = [...prev.panels];
      const panel = panels[meta.panelIndex];
      if (!panel) return prev;
      const style = {
        ...panel.style,
        freePosition: true,
        textAlignH: undefined,
        textAlignV: undefined,
      };
      if (meta.role === 'title') {
        style.titleX = localX;
        style.titleY = localY;
      } else {
        style.subtitleX = localX;
        style.subtitleY = localY;
      }
      panels[meta.panelIndex] = { ...panel, style };
      return { ...prev, panels };
    });
  };

  const handleTextResize = (id: string, boxWidth: number) => {
    const meta = parseTextElementId(id);
    if (!meta) return;
    const clamped = Math.min(1, Math.max(0.1, boxWidth));

    if (settings.mode === 'single') {
      setSettings((prev) => ({
        ...prev,
        options: {
          ...prev.options,
          freePosition: true,
          ...(meta.role === 'title'
            ? { titleBoxWidth: clamped }
            : { subtitleBoxWidth: clamped }),
        },
      }));
      return;
    }

    setSettings((prev) => {
      const panels = [...prev.panels];
      const panel = panels[meta.panelIndex];
      if (!panel) return prev;
      const style = {
        ...panel.style,
        freePosition: true,
        ...(meta.role === 'title'
          ? { titleBoxWidth: clamped }
          : { subtitleBoxWidth: clamped }),
      };
      panels[meta.panelIndex] = { ...panel, style };
      return { ...prev, panels };
    });
  };

  const handleSeamlessElementSelect = (id: string | null) => {
    if (!id) {
      setSelectedDeviceId(null);
      setSelectedStickerId(null);
      setSelectedTextId(null);
      return;
    }
    if (parseTextElementId(id)) {
      setSelectedTextId(id);
      setSelectedDeviceId(null);
      setSelectedStickerId(null);
      return;
    }
    if (devicePlacements.some((d) => d.id === id)) {
      setSelectedDeviceId(id);
      setSelectedStickerId(null);
      setSelectedTextId(null);
    } else {
      setSelectedStickerId(id);
      setSelectedDeviceId(null);
      setSelectedTextId(null);
    }
  };

  const seamlessElements: DraggableElement[] = useMemo(
    () => [
      ...devicePlacements.map((d) => ({
        id: d.id,
        x: d.x,
        y: d.y,
        width: d.width,
        rotation: d.rotation,
        kind: 'device' as const,
      })),
      ...stickers.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        width: s.width,
        aspectRatio: s.aspectRatio,
        kind: 'sticker' as const,
      })),
    ],
    [devicePlacements, stickers],
  );

  const handleDownload = async () => {
    if (!file || !selectedDevice || !screenshotUrl) return;
    setDownloading(true);
    setError(null);
    try {
      const placement = placementFromOptions(
        settings.options,
        selectedDevice,
        settings.orientation,
        settings.options.textPosition ?? 'bottom',
      );
      const bgBlob = await frameImage(file, settings, stickers, customFonts, {
        includeDevice: false,
        includeText: false,
      });
      const blob = await exportSingleImage({
        backgroundBlob: bgBlob,
        placement: {
          id: 'screenshot',
          file,
          url: screenshotUrl,
          name: file.name,
          x: placement.x,
          y: placement.y,
          width: placement.width,
          rotation: placement.rotation,
        },
        device: selectedDevice,
        orientation: settings.orientation,
        panelWidth: canvasSize.width,
        panelHeight: canvasSize.height,
        title: settings.title,
        subtitle: settings.subtitle,
        options: settings.options,
        customFonts,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appshots-${settings.device}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download screenshot');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!selectedDevice) return;
    setDownloading(true);
    setError(null);
    try {
      const result = await frameSeamlessImage(
        debouncedSettings,
        devicePlacements,
        stickers,
        debouncedCustomFonts,
        {
          previewScale: 1,
          includeDevices: false,
          includeText: false,
          cachedUploadFields: cachedUploadFieldsRef.current,
        },
      );
      markSeamlessUploadsCached(
        cachedUploadFieldsRef.current,
        devicePlacements,
        stickers,
        debouncedCustomFonts,
      );
      const panels = await exportSeamlessPanels({
        wideBackgroundBlob: result.wide,
        devicePlacements,
        device: selectedDevice,
        orientation: settings.orientation,
        panelCount: settings.panelCount,
        panelWidth: canvasSize.width,
        panelHeight: canvasSize.height,
        frameOptions: settings.options,
        panels: settings.panels,
        globalOptions: settings.options,
        customFonts: debouncedCustomFonts,
      });
      panels.forEach((blob, i) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `appshots-panel-${i + 1}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export panels');
    } finally {
      setDownloading(false);
    }
  };

  const handleAddCustomFonts = (files: FileList) => {
    const added = filterFontFiles(files).map(createCustomFontFromFile);
    if (added.length === 0) return;
    setCustomFonts((prev) => [...prev, ...added]);
  };

  const handleRemoveCustomFont = (id: string) => {
    setCustomFonts((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((f) => f.id !== id);
    });
    cachedUploadFieldsRef.current.delete(`font_${id}`);

    setSettings((prev) => {
      const ref = `custom:${id}`;
      const next = { ...prev, options: { ...prev.options } };
      if (next.options.titleFont === ref) next.options.titleFont = 'Inter';
      if (next.options.subtitleFont === ref) next.options.subtitleFont = 'Inter';
      return next;
    });
  };

  const revokeEditorAssets = useCallback(() => {
    stickers.forEach((s) => URL.revokeObjectURL(s.url));
    customFonts.forEach((f) => URL.revokeObjectURL(f.url));
    devicePlacements.forEach((d) => URL.revokeObjectURL(d.url));
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [stickers, customFonts, devicePlacements]);

  const getPreservedUploadFile = useCallback((): File | null => {
    if (settings.mode === 'single') return file;
    if (devicePlacements.length === 0) return null;
    const source = selectedDeviceId
      ? devicePlacements.find((d) => d.id === selectedDeviceId)
      : devicePlacements[0];
    return source?.file ?? null;
  }, [settings.mode, file, devicePlacements, selectedDeviceId]);

  const applyModeSwitch = useCallback(
    async (targetMode: 'single' | 'seamless', preservedFile: File | null) => {
      revokeEditorAssets();
      cachedUploadFieldsRef.current.clear();
      prevPlacementKeyRef.current = '';

      const nextSettings = { ...DEFAULT_SETTINGS, mode: targetMode };
      setSettings(nextSettings);
      setStickers([]);
      setCustomFonts([]);
      setSelectedStickerId(null);
      setSelectedDeviceId(null);
      setSelectedTextId(null);
      setError(null);

      if (targetMode === 'single' && preservedFile) {
        setDevicePlacements([]);
        setFile(preservedFile);
        return;
      }

      setFile(null);
      if (targetMode === 'seamless' && preservedFile) {
        const device = devices.find((d) => d.slug === nextSettings.device);
        if (device) {
          const placement = await loadDeviceFromFile(
            preservedFile,
            nextSettings.panelCount,
            device,
            nextSettings.orientation,
          );
          setDevicePlacements([placement]);
          setSelectedDeviceId(placement.id);
          return;
        }
      }
      setDevicePlacements([]);
    },
    [devices, revokeEditorAssets],
  );

  const handleModeChange = (targetMode: 'single' | 'seamless') => {
    if (targetMode === settings.mode) return;

    const preservedFile = getPreservedUploadFile();
    if (preservedFile) {
      setModeSwitchPending({ targetMode, preservedFile });
      return;
    }

    setSettings((prev) => ({ ...prev, mode: targetMode }));
  };

  const confirmModeSwitch = () => {
    if (!modeSwitchPending) return;
    const { targetMode, preservedFile } = modeSwitchPending;
    setModeSwitchPending(null);
    void applyModeSwitch(targetMode, preservedFile);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt=""
              className="h-9 w-9 rounded-xl"
              width={36}
              height={36}
            />
            <div>
              <h1 className="text-base font-semibold tracking-tight">appshots</h1>
              <p className="text-xs text-muted">App Store Screenshot Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/lnxredir/appshots-web"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted transition hover:text-white"
            >
              GitHub →
            </a>
            <span className="font-mono text-xs tabular-nums text-muted">v{APP_VERSION}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1">
        <aside className="w-[380px] shrink-0 overflow-y-auto border-r border-border p-6">
          <div className="mb-6">
            <ModeSelector settings={settings} onModeChange={handleModeChange} />
          </div>

          {!isSeamless && (
            <div className="mb-6">
              <UploadZone file={file} onFile={setFile} onClear={() => setFile(null)} />
            </div>
          )}

          {!isSeamless && file && selectedDevice && (
            <div className="mb-6">
              <ScreenshotPlacementControls
                settings={settings}
                device={selectedDevice}
                onOptionsChange={(patch) =>
                  setSettings((prev) => ({ ...prev, options: { ...prev.options, ...patch } }))
                }
                onInteractionStart={holdPreview}
                onInteractionEnd={releasePreview}
              />
            </div>
          )}

          {isSeamless && (
            <>
              <div className="mb-6">
                <DevicePlacementControls
                  devices={devicePlacements}
                  selectedId={selectedDeviceId}
                  deviceInfo={selectedDevice ?? devices[0]!}
                  panelCount={settings.panelCount}
                  orientation={settings.orientation}
                  gridAlign={settings.options.gridAlign ?? false}
                  onGridAlignChange={(gridAlign) =>
                    setSettings((prev) => ({
                      ...prev,
                      options: { ...prev.options, gridAlign },
                    }))
                  }
                  onAdd={handleAddDevices}
                  onInteractionStart={holdPreview}
                  onInteractionEnd={releasePreview}
                  onUpdate={(id, patch) =>
                    setDevicePlacements((prev) =>
                      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
                    )
                  }
                  onRemove={(id) => {
                    setDevicePlacements((prev) => {
                      const removed = prev.find((d) => d.id === id);
                      if (removed) URL.revokeObjectURL(removed.url);
                      return prev.filter((d) => d.id !== id);
                    });
                    cachedUploadFieldsRef.current.delete(`device_${id}`);
                    if (selectedDeviceId === id) setSelectedDeviceId(null);
                  }}
                  onSelect={setSelectedDeviceId}
                />
              </div>
              <div className="mb-6">
                <SeamlessPanelEditor
                  panelCount={settings.panelCount}
                  panelWidth={canvasSize.width}
                  panelHeight={canvasSize.height}
                  panels={settings.panels}
                  globalOptions={settings.options}
                  customFonts={customFonts}
                  stickers={stickers}
                  selectedStickerId={selectedStickerId}
                  onCustomFontsAdd={handleAddCustomFonts}
                  onCustomFontRemove={handleRemoveCustomFont}
                  onStickersAdd={handleAddStickers}
                  onStickerUpdate={(id, patch) =>
                    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
                  }
                  onStickerRemove={handleStickerRemove}
                  onStickerSelect={setSelectedStickerId}
                  onStickerInteractionStart={holdPreview}
                  onStickerInteractionEnd={releasePreview}
                  onAddIcon={handleAddIcon}
                  onPanelCountChange={handlePanelCountChange}
                  onPanelChange={handlePanelChange}
                />
              </div>
            </>
          )}

          <FrameControls
            devices={devices}
            settings={settings}
            customFonts={customFonts}
            stickers={stickers}
            selectedStickerId={selectedStickerId}
            selectedTextId={selectedTextId}
            onTextSelect={setSelectedTextId}
            onCustomFontsAdd={handleAddCustomFonts}
            onCustomFontRemove={handleRemoveCustomFont}
            onStickersAdd={handleAddStickers}
            onStickerUpdate={(id, patch) =>
              setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
            }
            onStickerRemove={handleStickerRemove}
            onStickerSelect={setSelectedStickerId}
            onStickerInteractionStart={holdPreview}
            onStickerInteractionEnd={releasePreview}
            onAddIcon={handleAddIcon}
            onChange={setSettings}
          />
        </aside>

        <section className="min-w-0 flex-1 p-6">
          {isSeamless ? (
            <SeamlessPreviewPanel
              previewUrl={previewUrl}
              loading={loading}
              error={error}
              deviceLabel={selectedDevice?.name ?? settings.device}
              device={selectedDevice}
              orientation={settings.orientation}
              panelCount={settings.panelCount}
              panelWidth={canvasSize.width}
              panelHeight={canvasSize.height}
              panels={settings.panels}
              globalOptions={settings.options}
              customFonts={customFonts}
              stickers={stickers}
              devicePlacements={devicePlacements}
              frameOptions={settings.options}
              elements={seamlessElements}
              selectedId={selectedDeviceId ?? selectedStickerId ?? selectedTextId}
              onElementMove={handleSeamlessElementMove}
              onTextMove={handleTextMove}
              onStickerResize={handleStickerResize}
              onStickerLayerChange={handleStickerLayerChange}
              onStickerRemove={handleStickerRemove}
              onElementSelect={handleSeamlessElementSelect}
              onInteractionStart={holdPreview}
              onInteractionEnd={releasePreview}
              onDownloadAll={handleDownloadAll}
              downloading={downloading}
              hasPreview={!!previewUrl}
            />
          ) : (
            <PreviewPanel
              previewUrl={previewUrl}
              loading={loading}
              error={error}
              deviceLabel={selectedDevice?.name ?? settings.device}
              dimensions={dimensions}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              screenshotUrl={screenshotUrl}
              device={selectedDevice}
              orientation={settings.orientation}
              settings={settings}
              frameOptions={settings.options}
              customFonts={customFonts}
              stickers={stickers}
              selectedStickerId={selectedStickerId}
              selectedTextId={selectedTextId}
              onScreenshotMove={(patch) =>
                setSettings((prev) => ({ ...prev, options: { ...prev.options, ...patch } }))
              }
              onStickerMove={(id, x, y) =>
                setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)))
              }
              onTextMove={handleTextMove}
              onTextResize={handleTextResize}
              onStickerResize={(id, width) =>
                handleStickerResize(id, Math.min(0.6, Math.max(0.03, width)))
              }
              onStickerLayerChange={handleStickerLayerChange}
              onStickerRemove={handleStickerRemove}
              onStickerSelect={(id) => {
                setSelectedTextId(null);
                setSelectedStickerId(id);
              }}
              onTextSelect={setSelectedTextId}
              onInteractionStart={holdPreview}
              onInteractionEnd={releasePreview}
              onDownload={handleDownload}
              downloading={downloading}
              hasPreview={!!previewUrl}
            />
          )}
        </section>
      </main>

      <ConfirmDialog
        open={modeSwitchPending !== null}
        title="Switch mode?"
        message="All current changes will be lost. Your uploaded screenshot will be carried over to the new mode."
        confirmLabel="Switch mode"
        onConfirm={confirmModeSwitch}
        onCancel={() => setModeSwitchPending(null)}
      />
    </div>
  );
}
