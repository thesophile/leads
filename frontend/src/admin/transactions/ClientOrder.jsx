import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import OrderFormDocument from './OrderFormDocument'
import { orderBarcodeValue } from './orderFormDocumentUtils'

function mapPublicOrder(d, token) {
  if (!d) return null
  return {
    id: d.id || '',
    orderDate: d.date || '',
    proposalNo: d.proposalNo || '',
    proposalDate: d.proposalDate || '',
    customerPerson: d.customer || '',
    customerCompany: d.company || '',
    customerPhone: d.customerPhone || '',
    customerLocation: d.city || '',
    email: d.companyEmail || '',
    bdm: d.bdm || '',
    proposalBy: d.proposalBy || '',
    total: d.total || '',
    discount: d.discount || '',
    net: d.netAmount || '',
    orderSummaryHtml: d.scope || '',
    orderInDetailsHtml: d.details || '',
    termsSummaryHtml: d.termsSummaryHtml || '',
    legalTermsHtml: d.termsFullHtml || '',
    status: d.status || 'Pending',
    currency: d.currency || '',
    clientLink: `${window.location.origin}/order/${token}`,
    orderBarcode: orderBarcodeValue(d.id),
  }
}

function DownloadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

  if (loadError || !data) {
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

  const order = mapPublicOrder(data, token)

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[210mm] px-3 py-5 sm:px-4">
        {/* Toolbar (hidden when printing) */}
        <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            {data.companyLogo ? (
              <img
                src={data.companyLogo}
                alt={data.companyName || 'Company logo'}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <span className="text-sm font-black uppercase tracking-wider text-slate-800">
                {data.companyName || 'Company'}
              </span>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600">Order Form</p>
              <p className="font-mono text-xs font-bold text-slate-900">{data.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <DownloadIcon />
              <span>{downloading ? 'Preparing…' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 transition cursor-pointer active:scale-95"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Official order form — same document as the internal preview */}
        <OrderFormDocument order={order} />

        <p className="print-hidden mt-4 text-center text-[11px] text-slate-400 leading-relaxed">
          {[data.companyName, data.companyAddress, data.companyPhone, data.companyEmail]
            .filter(Boolean)
            .join(' • ') || '— LEADS'}
        </p>
      </div>
    </div>
  )
}
