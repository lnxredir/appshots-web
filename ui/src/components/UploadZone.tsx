interface UploadZoneProps {
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function UploadZone({ file, onFile, onClear }: UploadZoneProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith('image/')) onFile(dropped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFile(selected);
  };

  if (file) {
    return (
      <div className="rounded-xl border border-border bg-panel p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:bg-panel-hover hover:text-white"
          >
            Replace
          </button>
        </div>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-panel px-6 py-10 transition hover:border-accent/50 hover:bg-panel-hover"
    >
      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleChange} />
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent transition group-hover:scale-105">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="text-sm font-medium">Drop a screenshot here</p>
      <p className="mt-1 text-xs text-muted">PNG, JPEG, or WebP</p>
    </label>
  );
}
