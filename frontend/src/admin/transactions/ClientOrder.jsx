import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wrappableHtml(html) {
  return String(html || '').replace(/&nbsp;/gi, ' ')
}

function currencySymbol(raw) {
  const m = String(raw || '').match(/(₹|€|£|AED|\$)/)
  return m ? m[1] : '₹'
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function ClientOrder() {
  const { token } = useParams()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await api.get(`/transactions/public/orders/${encodeURIComponent(token)}/`)
        if (!cancelled) setData(d)
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const currency = useMemo(() => currencySymbol(data?.currency), [data?.currency])

  async function handleDownloadPdf() {
    if (downloading) return
    setDownloading(true)
    try {
      await api.download(
        `/transactions/public/orders/${encodeURIComponent(token)}/pdf/`,
        `${data?.id || 'order'}.pdf`
      )
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-400">Loading order form…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h1 className="mt-3 text-sm font-bold text-slate-900">Link unavailable</h1>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{loadError}</p>
          <p className="mt-2 text-xs text-slate-400">Please contact the sender for a fresh link.</p>
        </div>
      </div>
    )
  }

  const d = data
  const scopeHtml = d.scope || ''
  const detailsHtml = d.details || ''
  const companyTerms = d.companyTerms || ''

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        {/* Brand header */}
        <div className="rounded-t-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {d.companyLogo ? (
                <img
                  src={d.companyLogo}
                  alt={d.companyName || 'Company logo'}
                  className="h-11 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <span className="text-sm font-black uppercase tracking-wider text-slate-800">
                  {d.companyName || 'Company'}
                </span>
              )}
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="font-mono text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                  Order Form {d.id}
                </p>
                <p className="text-xs font-bold text-slate-900 truncate">{d.company}</p>
              </div>
            </div>
            {d.date && (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {d.date}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-slate-50/70 shadow-sm">
          {/* Customer + financials */}
          <div className="grid gap-3 p-5 sm:grid-cols-12">
            <div className="sm:col-span-7">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Client
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">{d.customer}</p>
              {d.category && (
                <p className="text-xs text-slate-500">{d.category}{d.city ? ` • ${d.city}` : ''}</p>
              )}
              {d.proposalNo && (
                <p className="mt-1 font-mono text-[11px] text-slate-400">{d.proposalNo}</p>
              )}
            </div>
            <div className="sm:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {currency}{d.total}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-mono text-slate-600">− {currency}{d.discount}</span>
                </div>
                <div className="mt-2 border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Net amount
                  </span>
                  <span className="font-mono text-base font-black text-slate-900">
                    {currency}{d.netAmount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order summary, details & terms */}
          <div className="space-y-3 px-5 pb-5">
            {scopeHtml && stripHtml(scopeHtml) && (
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <div className="bg-black px-3 py-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-white">
                    Order Summary
                  </span>
                </div>
                <div
                  className="bg-white p-4 text-[13px] leading-relaxed text-slate-800 space-y-2"
                  dangerouslySetInnerHTML={{ __html: wrappableHtml(scopeHtml) }}
                />
              </div>
            )}

            {detailsHtml && stripHtml(detailsHtml) && (
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <div className="bg-black px-3 py-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-white">
                    Order in Details
                  </span>
                </div>
                <div
                  className="bg-white p-4 text-[13px] leading-relaxed text-slate-800 space-y-2"
                  dangerouslySetInnerHTML={{ __html: wrappableHtml(detailsHtml) }}
                />
              </div>
            )}

            {companyTerms && stripHtml(companyTerms) && (
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <div className="bg-slate-100 px-3 py-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-slate-700">
                    Terms & Conditions
                  </span>
                </div>
                <div
                  className="bg-white p-4 text-[12.5px] leading-relaxed text-slate-700 space-y-2"
                  dangerouslySetInnerHTML={{ __html: wrappableHtml(companyTerms) }}
                />
              </div>
            )}

            {!scopeHtml && !detailsHtml && !companyTerms && (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-400">
                Order details not provided.
              </p>
            )}
          </div>

          {/* Read-only note + download */}
          <div className="border-t border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-900">Your order form</p>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              This is the official copy of your order form. It has already been
              confirmed, so no acceptance is required online. You can download a PDF
              copy any time using the button below.
            </p>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition cursor-pointer active:scale-[0.98] disabled:opacity-60"
            >
              <DownloadIcon />
              {downloading ? 'Preparing…' : 'Download order form (PDF)'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-[11px] text-slate-400 leading-relaxed">
          {[d.companyName, d.companyAddress, d.companyPhone, d.companyEmail]
            .filter(Boolean)
            .join(' • ') || '— LEADS'}
        </p>
      </div>
    </div>
  )
}