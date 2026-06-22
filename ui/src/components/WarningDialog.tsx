interface WarningDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function WarningDialog({
  open,
  title,
  message,
  confirmLabel = 'Got it',
  onConfirm,
}: WarningDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/60"
        onClick={onConfirm}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="warning-dialog-title"
        className="relative w-full max-w-sm rounded-xl border border-red-500/40 bg-panel p-5 shadow-xl"
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 id="warning-dialog-title" className="text-sm font-semibold text-red-300">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
