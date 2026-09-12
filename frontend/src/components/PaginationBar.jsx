function ChevronIcon({ direction = 'right', className = 'h-3.5 w-3.5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={direction === 'left' ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function getPageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1, current - 1, current, current + 1, total]
  const unique = [...new Set(pages)]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  return unique.flatMap((p, i) => {
    if (i === 0) return [p]
    return p - unique[i - 1] > 1 ? ['ellipsis', p] : [p]
  })
}

export default function PaginationBar({ page, totalPages, count, pageSize = 25, onChange, className = '' }) {
  if (!count) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, count)
  const pageItems = totalPages > 1 ? getPageItems(page, totalPages) : []

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 text-[11px] ${className}`}>
      <span className="text-slate-400 font-medium">
        Showing {start} to {end} of {count} entries
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          title="Previous page"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronIcon direction="left" />
        </button>

        {pageItems.map((item, i) =>
          item === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1 text-slate-400 select-none">…</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={page === item ? 'page' : undefined}
              className={`flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-semibold transition-colors cursor-pointer ${
                page === item
                  ? 'bg-brand-50 text-brand-600 font-bold border border-brand-200/60'
                  : 'border border-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          title="Next page"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>
    </div>
  )
}