import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import Layout from '../../Layout/Layout'
import { useAuth } from '../../context/auth-context'
import { can } from '../../utils/permissions'
import { api } from '../../api/client'
import SendToClientModal from './SendToClientModal'
import OrderFormDocument from './OrderFormDocument'
import RefreshButton from '../../components/RefreshButton'
import { clientOrderLink, orderBarcodeValue } from './orderFormDocumentUtils'

function mapOrder(o) {
  if (!o) {
    return null
  }
  return {
    id: o.id || '',
    orderDate: o.date || '',
    proposalNo: o.proposalNo || '',
    proposalDate: o.proposalDate || '',
    customerPerson: o.customer || '',
    customerCompany: o.company || '',
    customerPhone: o.mobile || '',
    customerLocation: o.city || '',
    email: o.email || '',
    bdm: o.bdm || '',
    proposalBy: o.proposalBy || o.staff || '',
    total: o.total || '',
    discount: o.discount || '',
    net: o.netAmount || '',
    orderSummaryHtml: o.scope || '',
    orderInDetailsHtml: o.details || '',
    termsSummaryHtml: o.termsSummaryHtml || '',
    legalTermsHtml: o.termsFullHtml || '',
    status: o.status || 'Pending',
    clientToken: o.clientToken || '',
    currency: o.currency || '',
    clientLink: clientOrderLink(o.clientToken),
    orderBarcode: orderBarcodeValue(o.id),
  }
}

export default function OrderPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { user } = useAuth()
  const canSendToClient = !!user && (can(user, 'order.edit') || user.is_superuser)

  const [orderData, setOrderData] = useState(() =>
    location.state?.order ? mapOrder(location.state.order) : null
  )
  const [loadingQuote, setLoadingQuote] = useState(() => !location.state?.order)
  const [refreshing, setRefreshing] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Load the real order by its id from the backend.
  const loadOrder = useCallback(async () => {
    if (!params.id) return
    try {
      const data = await api.get(`/transactions/orders/${encodeURIComponent(params.id)}/`)
      setOrderData(data ? mapOrder(data) : null)
      if (!data) setNotFound(true)
    } catch {
      setNotFound(true)
    } finally {
      setLoadingQuote(false)
    }
  }, [params.id])

  // If we arrived without navigation state (refresh, direct link, notification
  // click), load the real order by its id from the backend.
  useEffect(() => {
    if (orderData) return
    ;(async () => {
      await loadOrder()
    })()
  }, [orderData, loadOrder])

  const [sendClientOpen, setSendClientOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [downloading, setDownloading] = useState(false)

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage('')
    }, 3000)
  }

  async function handleDownloadPdf() {
    if (downloading) return
    setDownloading(true)
    try {
      await api.download(
        `/transactions/orders/${encodeURIComponent(orderData.id)}/pdf/`,
        `${orderData.id}.pdf`
      )
      showToast('✓ Order form PDF downloaded.')
    } catch (err) {
      showToast(err.message || 'Could not download the PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const sendTarget = {
    id: orderData?.id || '',
    customer: orderData?.customerPerson || '',
    company: orderData?.customerCompany || '',
    mobile: orderData?.customerPhone || '',
    email: orderData?.email || '',
    netAmount: orderData?.net || '',
    status: orderData?.status || '',
  }

  function handleOrderSent(updated) {
    setOrderData((prev) => ({ ...(prev || {}), ...mapOrder(updated || {}) }))
  }

  if (loadingQuote) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">
          Loading order form…
        </div>
      </Layout>
    )
  }

  if (notFound || !orderData) {
    return (
      <Layout>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition cursor-pointer"
          >
            <span>←</span>
            <span>Back to Orders</span>
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <p className="text-sm font-bold text-slate-800">Order not found</p>
            <p className="mt-1 text-xs text-slate-500">
              This order does not exist or you do not have permission to view it.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Sticky Action Toolbar */}
        <div className="print-hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition cursor-pointer"
            >
              <span>←</span>
              <span>Back to Orders</span>
            </button>
            <span className="text-xs font-bold text-slate-900">
              Official Order Form: <span className="font-mono text-brand-700">{orderData.id}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton onClick={async () => { setRefreshing(true); setNotFound(false); try { await loadOrder() } finally { setRefreshing(false) } }} loading={refreshing} compact />
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 transition cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <span>⬇</span>
              <span>{downloading ? 'Preparing…' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer active:scale-95"
            >
              <span>🖨️</span>
              <span>Print Order Form</span>
            </button>

            {canSendToClient && (
              <button
                type="button"
                onClick={() => setSendClientOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-95"
              >
                <span>📤</span>
                <span>Share Order Form</span>
              </button>
            )}
          </div>
        </div>

        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-xs font-semibold text-slate-800">{toastMessage}</span>
          </div>
        )}

        {/* Official Order Form Document (shared with the client-facing page) */}
        <OrderFormDocument order={orderData} />
      </div>

      {/* Send to Client modal */}
      {sendClientOpen && (
        <SendToClientModal
          item={sendTarget}
          open
          onClose={() => setSendClientOpen(false)}
          onSent={handleOrderSent}
          onToast={showToast}
        />
      )}
    </Layout>
  )
}
