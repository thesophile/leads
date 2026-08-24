export default function ConfirmDialog({
  open,
  title = 'Discard changes?',
  message = 'You have unsaved changes. Are you sure you want to close without saving?',
  cancelLabel = 'Keep Editing',
  confirmLabel = 'Discard',
  extraLabel,
  onExtra,
  onCancel,
  onConfirm,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
          {extraLabel && (
            <button
              type="button"
              onClick={onExtra}
              className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition cursor-pointer shadow-xs mr-auto"
            >
              {extraLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer shadow-xs"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}