import { useEffect, useRef, useState } from 'react'
import { clearResponseCache } from '../api/client'

// Fade the active screen's table out, refresh, then fade it back in.
const MIN_BUSY_MS = 350
const MIN_BLANK_MS = 220
const FALLBACK_MS = 2500

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
  const [busy, setBusy] = useState(false)
  const busyTimerRef = useRef(null)
  const prevLoadingRef = useRef(loading)
  const refreshPendingRef = useRef(false)
  const refreshOutAtRef = useRef(0)
  const fallbackTimerRef = useRef(null)

  const isDisabled = disabled || loading || busy

  // Fade the table back in once the refresh has had its blank moment.
  function fadeTableIn() {
    if (!refreshPendingRef.current) return
    refreshPendingRef.current = false
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
    const wait = Math.max(0, MIN_BLANK_MS - (Date.now() - refreshOutAtRef.current))
    setTimeout(() => window.dispatchEvent(new CustomEvent('leads:refresh-in')), wait)
  }

  // The screen's `loading` flag toggles when its refresh fetch completes; use
  // that as the trigger for the fade back in.
  useEffect(() => {
    if (prevLoadingRef.current && !loading) fadeTableIn()
    prevLoadingRef.current = loading
  }, [loading])

  function handleRefresh() {
    if (isDisabled) return
    refreshPendingRef.current = true
    refreshOutAtRef.current = Date.now()
    window.dispatchEvent(new CustomEvent('leads:refresh-out'))
    clearResponseCache()
    setBusy(true)
    // Safety net: never leave the table faded out if loading never toggles.
    fallbackTimerRef.current = setTimeout(() => {
      refreshOutAtRef.current = Date.now()
      fadeTableIn()
    }, FALLBACK_MS)

    const startedAt = Date.now()
    let result
    try {
      result = onClick()
    } catch {
      result = undefined
    }
    const finish = () => {
      const remaining = Math.max(0, MIN_BUSY_MS - (Date.now() - startedAt))
      if (busyTimerRef.current) clearTimeout(busyTimerRef.current)
      busyTimerRef.current = setTimeout(() => setBusy(false), remaining)
    }
    if (result && typeof result.then === 'function') {
      result.then(finish, finish)
    } else {
      finish()
    }
  }

  const busyNow = loading || busy

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isDisabled}
        title={title}
        aria-label={label}
        className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <RefreshGlyph className={busyNow ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isDisabled}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <RefreshGlyph className={busyNow ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
      <span>{busyNow ? 'Refreshing…' : label}</span>
    </button>
  )
}