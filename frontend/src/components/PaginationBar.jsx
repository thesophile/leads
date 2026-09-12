export default function PaginationBar({ page, totalPages, count, pageSize = 100, onChange, className = '' }) {
  if (!count) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, count)

  return (
    <div className={`flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px] ${className}`}>
      <span className="text-slate-400 font-medium">
        Showing {start} to {end} of {count} entries
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="px-1.5 text-slate-500">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}