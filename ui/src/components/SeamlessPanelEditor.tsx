import { CustomFontControls } from './CustomFontControls';
import { IconControls } from './IconControls';
import { StickerControls } from './StickerControls';
import { TextStylingSection } from './TextStylingSection';
import { panelEffectiveOptions } from '../lib/panel-text-layout';
import type { CustomFont, FrameOptions, SeamlessPanelConfig, Sticker } from '../types';
import type { IconPackId } from '../lib/icons';

interface SeamlessPanelEditorProps {
  panelCount: number;
  panelWidth: number;
  panelHeight: number;
  panels: SeamlessPanelConfig[];
  globalOptions: Partial<FrameOptions>;
  customFonts: CustomFont[];
  stickers: Sticker[];
  selectedStickerId: string | null;
  onCustomFontsAdd: (files: FileList) => void;
  onCustomFontRemove: (id: string) => void;
  onStickersAdd: (files: FileList) => void;
  onStickerUpdate: (id: string, patch: Partial<Sticker>) => void;
  onStickerRemove: (id: string) => void;
  onStickerSelect: (id: string | null) => void;
  onStickerInteractionStart?: () => void;
  onStickerInteractionEnd?: () => void;
  onAddIcon: (iconName: string, pack: IconPackId, color: string) => void;
  onPanelCountChange: (count: number) => void;
  onPanelChange: (index: number, patch: Partial<SeamlessPanelConfig>) => void;
}

function PanelStyleSection({
  panel,
  index,
  globalOptions,
  customFonts,
  panelWidth,
  panelHeight,
  onPanelChange,
}: {
  panel: SeamlessPanelConfig;
  index: number;
  globalOptions: Partial<FrameOptions>;
  customFonts: CustomFont[];
  panelWidth: number;
  panelHeight: number;
  onPanelChange: (index: number, patch: Partial<SeamlessPanelConfig>) => void;
}) {
  const effectiveOptions = panelEffectiveOptions(globalOptions, panel);

  return (
    <TextStylingSection
      title={panel.title}
      subtitle={panel.subtitle}
      options={effectiveOptions}
      customFonts={customFonts}
      panelWidth={panelWidth}
      panelHeight={panelHeight}
      onOptionsChange={(patch) => onPanelChange(index, { style: { ...panel.style, ...patch } })}
    />
  );
}

export function SeamlessPanelEditor({
  panelCount,
  panelWidth,
  panelHeight,
  panels,
  globalOptions,
  customFonts,
  stickers,
  selectedStickerId,
  onCustomFontsAdd,
  onCustomFontRemove,
  onStickersAdd,
  onStickerUpdate,
  onStickerRemove,
  onStickerSelect,
  onStickerInteractionStart,
  onStickerInteractionEnd,
  onAddIcon,
  onPanelCountChange,
  onPanelChange,
}: SeamlessPanelEditorProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Panels</h3>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Panel count</label>
        <div className="grid grid-cols-4 gap-2">
          {[2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPanelCountChange(n)}
              className={`rounded-lg border px-2 py-2 text-sm transition ${
                panelCount === n
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-border bg-panel text-muted hover:bg-panel-hover'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <CustomFontControls fonts={customFonts} onAdd={onCustomFontsAdd} onRemove={onCustomFontRemove} />

      <StickerControls
        stickers={stickers}
        selectedId={selectedStickerId}
        onAdd={onStickersAdd}
        onUpdate={onStickerUpdate}
        onRemove={onStickerRemove}
        onSelect={onStickerSelect}
        onInteractionStart={onStickerInteractionStart}
        onInteractionEnd={onStickerInteractionEnd}
      />

      <IconControls onAddIcon={onAddIcon} />

      <div className="space-y-2">
        {Array.from({ length: panelCount }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-panel p-3">
            <p className="mb-2 text-xs font-medium text-muted">Panel {i + 1}</p>
            <input
              type="text"
              value={panels[i]?.title ?? ''}
              onChange={(e) => onPanelChange(i, { title: e.target.value })}
              placeholder="Title"
              className="mb-2 w-full rounded-lg border border-border bg-[#0e0e14] px-3 py-2 text-sm outline-none transition focus:border-accent"
            />
            <input
              type="text"
              value={panels[i]?.subtitle ?? ''}
              onChange={(e) => onPanelChange(i, { subtitle: e.target.value })}
              placeholder="Subtitle"
              className="w-full rounded-lg border border-border bg-[#0e0e14] px-3 py-2 text-sm outline-none transition focus:border-accent"
            />
            <PanelStyleSection
              panel={panels[i] ?? { title: '', subtitle: '' }}
              index={i}
              globalOptions={globalOptions}
              customFonts={customFonts}
              panelWidth={panelWidth}
              panelHeight={panelHeight}
              onPanelChange={onPanelChange}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
