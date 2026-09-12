import { clearResponseCache } from '../api/client'

function RefreshGlyph({ className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  )
}

export default function RefreshButton({
  onClick,
  loading = false,
  disabled = false,
  label = 'Refresh',
  compact = false,
  title = 'Refresh data',
  className = '',
}) {
  const isDisabled = disabled || loading

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => { clearResponseCache(); onClick() }}
        disabled={isDisabled}
        title={title}
        aria-label={label}
        className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <RefreshGlyph className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { clearResponseCache(); onClick() }}
      disabled={isDisabled}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <RefreshGlyph className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
      <span>{loading ? 'Refreshing…' : label}</span>
    </button>
  )
}
