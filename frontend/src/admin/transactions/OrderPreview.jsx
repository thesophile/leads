import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import Layout from '../../Layout/Layout'
import { useAuth } from '../../context/auth-context'
import { can } from '../../utils/permissions'
import { api } from '../../api/client'
import usePagedContent from '../../utils/usePagedContent'
import PagedSection from '../../utils/PagedSection'
import SendToClientModal from './SendToClientModal'

function wrappableHtml(html) {
  return String(html || '').replace(/&nbsp;/gi, ' ')
}

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
    clientStatus: o.clientStatus || '',
    clientRespondedAt: o.clientRespondedAt || '',
    clientToken: o.clientToken || '',
    currency: o.currency || '',
    clientLink: clientOrderLink(o.clientToken),
    orderBarcode: orderBarcodeValue(o.id),
  }
}

function formatStamp(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toISOString().replace('T', ' ').replace('Z', '')
  } catch {
    return iso
  }
}

function orderBarcodeValue(id) {
  const digits = String(id || '').replace(/\D/g, '')
  return (digits || id).slice(0, 14)
}

function clientOrderLink(clientToken) {
  if (!clientToken) return ''
  return `${window.location.origin}/order/${clientToken}`
}

function QRCodeVisual({ value }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white p-0.5">
      <QRCodeSVG
        value={value || 'NO-LINK'}
        size={84}
        level="H"
        fgColor="#000000"
        bgColor="#ffffff"
        className="h-full w-full"
      />
    </div>
  )
}

function ProgramersLogo() {
  return (
    <div className="flex flex-col items-start">
      <img
        src="/programers-logo-BLACCK.png"
        alt="PROGRAMERS INTERNATIONAL"
        className="h-9 w-auto object-contain"
      />
    </div>
  )
}

function PageHeader({ order, annexLabel }) {
  return (
    <div className="flex items-start justify-between border-b-2 border-black pb-2">
      {/* Left: Programers Logo & Barcode */}
      <div className="flex flex-col items-start">
        <ProgramersLogo />
        <div className="pt-0.5">
          <Barcode
            value={order.orderBarcode}
            format="CODE128"
            width={1.8}
            height={26}
            displayValue={true}
            fontSize={11}
            margin={0}
            background="transparent"
          />
        </div>
      </div>

      {/* Center: ORDER FORM & GeM Logo */}
      <div className="flex flex-col items-center justify-center pt-0.5 text-center">
        <h2 className="text-3xl font-black tracking-widest text-black uppercase font-sans">
          ORDER FORM
        </h2>
        {/* Ornamental Ribbon */}
        <div className="text-slate-600 text-sm tracking-widest leading-none my-0.5 select-none">
          ୨୧┈┈┈┈୨୧
        </div>
        <img
          src="/GeM.png"
          alt="GeM - Government e Marketplace"
          className="h-10 w-auto object-contain mt-0.5"
        />
      </div>

      {/* Right: Order #, Date, QR Code & Annexure */}
      <div className="flex items-start gap-2">
        <div className="text-right">
          <div className="rounded border border-black bg-black px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
            ORDER #
          </div>
          <div className="mt-1 text-[13px] font-black tracking-wide text-black font-mono">
            {order.id}
          </div>
          <div className="mt-1.5 rounded border border-black bg-black px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
            ORDER DATE
          </div>
          <div className="mt-1 text-[13px] font-bold text-black font-mono">
            {order.orderDate}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="h-16 w-16 overflow-hidden rounded border border-black bg-white p-0.5">
            <QRCodeVisual value={order.clientLink} />
          </div>
          <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-black">
            {annexLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

function SectionBox({ title, children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-md border border-black bg-white flex flex-col ${className}`}>
      <div className="border-b border-black bg-black px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider text-white text-center shrink-0">
        {title}
      </div>
      <div className="p-3.5 text-[13px] leading-relaxed text-black flex-1 flex flex-col justify-start">
        {children}
      </div>
    </div>
  )
}

function FinancialBanner({ order }) {
  return (
    <div className="rounded-md border border-black bg-white p-2 text-black mt-1.5 shrink-0">
      <div className="border-b border-slate-300 pb-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-black">
        All Amt In | No Additional Service Or Items | E&amp;O
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1 px-1 text-[13px]">
        <div className="font-bold">
          Total: <span className="font-mono text-black">{order.total}</span>
        </div>
        <div className="font-bold text-slate-700 text-[12px]">
          (Discount: <span className="font-mono text-black">{order.discount}</span>)
        </div>
        <div className="rounded bg-black px-3 py-0.5 text-[13px] font-black text-white">
          Net: <span className="font-mono">{order.net}</span>
        </div>
      </div>
      {order.amountWords ? (
        <div className="mt-1.5 border-t border-slate-300 pt-1 text-center text-[12px] font-black uppercase tracking-widest text-black">
          {order.amountWords}
        </div>
      ) : null}
    </div>
  )
}

function PageFooter() {
  return (
    <div className="border-t border-black pt-1.5 text-center text-[10.5px] leading-tight text-slate-800 shrink-0">
      <p className="font-medium">
        4th Floor, Park House ,Round North, Thrissur, Kerala, India - 680 001 | info@programers.in, www.programers.in | Ph: 9447151442, 9495951442, 9446451442
      </p>
      <p className="text-[9.5px] text-slate-500 mt-0.5">
        Purchase authorization request
      </p>
    </div>
  )
}

function SignatureCell({ title, statusTone, badge, company, stamp, children }) {
  return (
    <div className="col-span-5 rounded-md border border-black bg-white p-2">
      <div className="border-b border-black bg-black -mx-2 -mt-2 px-2 py-1 text-center text-[11px] font-bold uppercase text-white mb-1">
        {title}
      </div>
      <div className="mt-1 text-[11px]">
        <p className={`font-bold flex items-center gap-1 ${statusTone}`}>
          {badge}
        </p>
        {company ? (
          <p className="text-slate-800 font-semibold mt-0.5">{company}</p>
        ) : null}
        {stamp ? (
          <p className="text-slate-500 text-[9.5px] font-mono mt-0.5">{stamp}</p>
        ) : null}
        {children}
      </div>
    </div>
  )
}

function SignatureBlock({ order }) {
  const accepted = order.clientStatus === 'Accepted'
  const declined = order.clientStatus === 'Declined'
  const decided = accepted || declined
  const respondedStamp = order.clientRespondedAt
    ? `Date: ${formatStamp(order.clientRespondedAt)}`
    : ''
  return (
    <div className="grid grid-cols-12 gap-2">
      <SignatureCell
        title="Approved By"
        statusTone={decided ? 'text-emerald-700' : 'text-slate-400'}
        badge={decided ? <><span>Signed &amp; recorded</span><span className="text-sm">✔</span></> : <span>Awaiting signature</span>}
        company={decided ? 'Programers International' : ''}
        stamp={decided ? respondedStamp : ''}
      >
        {!decided && (
          <p className="text-slate-400 text-[9.5px] mt-0.5">
            Signature is recorded once the client responds to this order form.
          </p>
        )}
      </SignatureCell>

      <SignatureCell
        title="Accepted By"
        statusTone={accepted ? 'text-emerald-700' : declined ? 'text-rose-600' : 'text-slate-400'}
        badge={
          accepted
            ? <><span>Signature valid</span><span className="text-sm">✔</span></>
            : declined
              ? <span>Client declined this order</span>
              : <span>Awaiting client acceptance</span>
        }
        company={accepted || declined ? order.customerCompany : ''}
        stamp={decided ? respondedStamp : ''}
      />

      <div className="col-span-2 flex items-center justify-center rounded-md border border-black bg-white p-1">
        <div className="h-[72px] w-[72px]">
          <QRCodeVisual value={order.clientLink} />
        </div>
      </div>
    </div>
  )
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
  const [notFound, setNotFound] = useState(false)

  // If we arrived without navigation state (refresh, direct link, notification
  // click), load the real order by its id from the backend.
  useEffect(() => {
    if (orderData || !params.id) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get(`/transactions/orders/${encodeURIComponent(params.id)}/`)
        if (!cancelled) setOrderData(data ? mapOrder(data) : null)
        if (!cancelled && !data) setNotFound(true)
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoadingQuote(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params.id, orderData])

  const [sendClientOpen, setSendClientOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage('')
    }, 3000)
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

  const approvedRowRef = useRef(null)
  const page2FooterRef = useRef(null)
  const page3SigRef = useRef(null)
  const page3FooterRef = useRef(null)
  const summaryContentRef = useRef(null)
  const termsSummaryContentRef = useRef(null)
  const detailsContentRef = useRef(null)
  const legalTermsContentRef = useRef(null)
  const summaryPaged = usePagedContent(summaryContentRef, approvedRowRef, [], 48)
  const termsSummaryPaged = usePagedContent(termsSummaryContentRef, approvedRowRef, [], 48)
  const detailsPaged = usePagedContent(detailsContentRef, page2FooterRef, [], 64)
  const legalPaged = usePagedContent(legalTermsContentRef, page3FooterRef, [page3SigRef], 64)

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
                <span>Send to Client</span>
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

        {/* Continuous Multi-Page Document Container */}
        <div className="space-y-8 print:space-y-0">
          {/* =========================================================================
              PAGE 1: MAIN ORDER FORM (Annexure - A (2))
          ========================================================================= */}
          <div
            className="print-page mx-auto w-full max-w-[210mm] h-[297mm] overflow-hidden bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm flex flex-col justify-between"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="flex flex-col flex-1 justify-between">
              <PageHeader order={orderData} annexLabel="Annexure - A (2)" />

              {/* 3-Column Metadata Grid */}
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <SectionBox title="CUSTOMER DETAILS">
                  <div className="space-y-1">
                    <p className="font-bold text-black text-[14px]">{orderData.customerPerson}</p>
                    <p className="text-slate-700 font-mono text-[12px]">{orderData.customerPhone}</p>
                    <p className="text-slate-600 text-[11.5px]">{orderData.customerLocation}</p>
                  </div>
                </SectionBox>

                <SectionBox title="ORDER DETAILS">
                  <div className="space-y-1">
                    <p className="font-bold text-black text-[14px]">{orderData.customerCompany}</p>
                    <p className="text-slate-700 text-[12px]">
                      Proposal Date: <span className="font-mono font-bold text-black">{orderData.proposalDate}</span>
                    </p>
                  </div>
                </SectionBox>

                <SectionBox title="PROJECT DETAILS">
                  <div className="space-y-1">
                    <p className="text-[12px]">
                      BDO /BDM: <span className="font-bold text-black">{orderData.bdm}</span>
                    </p>
                    <p className="text-[12px]">
                      Proposal #: <span className="font-mono font-bold text-black">{orderData.proposalNo}</span>
                    </p>
                    <p className="text-[12px]">
                      Proposal By: <span className="font-medium text-slate-700">{orderData.proposalBy}</span>
                    </p>
                  </div>
                </SectionBox>
              </div>

              <p className="mt-2 text-[10.5px] italic leading-tight text-slate-600 text-center">
                This Proposal form is issued in connection with the proposed project, and confirms our intent to proceed with the implementation as per the agreed terms and conditions.
              </p>

              {/* Middle Grid: Left (Order Summary + Financial Banner) & Right (Terms & Conditions) */}
              <div className="mt-2 grid grid-cols-12 gap-2 flex-1 min-h-[440px]">
                {/* Left Column (col-span-7): Order Summary + Financial Banner */}
                <div className="col-span-7 flex flex-col justify-between">
<SectionBox title="ORDER SUMMARY" className="flex-1">
                    <div
                      ref={summaryContentRef}
                      className="space-y-1.5 text-[13px] leading-relaxed text-black"
                      style={summaryPaged.cap ? { maxHeight: summaryPaged.cap, overflow: 'hidden' } : undefined}
                      dangerouslySetInnerHTML={{ __html: wrappableHtml(orderData.orderSummaryHtml) }}
                    />
                    {summaryPaged.part2Html ? (
                      <p className="mt-2 text-right text-[10.5px] font-bold text-slate-500">
                        --- Continued ---
                      </p>
                    ) : (
                      <p className="mt-auto pt-2 text-center text-[10.5px] font-bold text-slate-500">
                        --- Continued ---
                      </p>
                    )}
                  </SectionBox>

                  <FinancialBanner order={orderData} />
                </div>

                {/* Right Column (col-span-5): Terms & Conditions */}
                <div className="col-span-5 flex flex-col">
                  <SectionBox title="TERMS &amp; CONDITIONS" className="h-full">
<div
                      ref={termsSummaryContentRef}
                      className="space-y-1.5 text-[11px] leading-relaxed text-slate-700"
                      style={termsSummaryPaged.cap ? { maxHeight: termsSummaryPaged.cap, overflow: 'hidden' } : undefined}
                      dangerouslySetInnerHTML={{ __html: wrappableHtml(orderData.termsSummaryHtml) }}
                    />
                    {termsSummaryPaged.part2Html ? (
                      <p className="mt-2 text-right text-[10.5px] font-bold text-slate-500">
                        --- Continued ---
                      </p>
                    ) : (
                      <p className="mt-auto pt-2 text-center text-[10.5px] font-bold text-slate-500">
                        --- Detailed continued in Page 2 ---
                      </p>
                    )}
                  </SectionBox>
                </div>
              </div>

              {/* Bottom 2-Box Row: Approved By | Accepted By */}
              <div ref={approvedRowRef} className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <SignatureCell
                  title="Approved By"
                  statusTone={orderData.clientStatus ? 'text-emerald-700' : 'text-slate-400'}
                  badge={
                    orderData.clientStatus
                      ? <><span>Signed &amp; recorded</span><span className="text-sm">✔</span></>
                      : <span>Awaiting signature</span>
                  }
                  company={orderData.clientStatus ? 'Programers International' : ''}
                  stamp={orderData.clientRespondedAt ? `Date: ${formatStamp(orderData.clientRespondedAt)}` : ''}
                />
                <SignatureCell
                  title="Accepted By"
                  statusTone={
                    orderData.clientStatus === 'Accepted'
                      ? 'text-emerald-700'
                      : orderData.clientStatus === 'Declined'
                        ? 'text-rose-600'
                        : 'text-slate-400'
                  }
                  badge={
                    orderData.clientStatus === 'Accepted'
                      ? <><span>Signature valid</span><span className="text-sm">✔</span></>
                      : orderData.clientStatus === 'Declined'
                        ? <span>Client declined this order</span>
                        : <span>Awaiting client acceptance</span>
                  }
                  company={
                    orderData.clientStatus === 'Accepted' || orderData.clientStatus === 'Declined'
                      ? orderData.customerCompany
                      : ''
                  }
                  stamp={orderData.clientRespondedAt ? `Date: ${formatStamp(orderData.clientRespondedAt)}` : ''}
                />
              </div>
            </div>

            <div className="mt-2.5">
              <PageFooter />
            </div>
          </div>

          {/* =========================================================================
              PAGE 2: ANNEXURE - A (1/2) ORDER IN DETAILS
          ========================================================================= */}
          <div
            className="print-page mx-auto w-full max-w-[210mm] h-[297mm] overflow-hidden bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm flex flex-col justify-between"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="flex flex-col flex-1 justify-between">
              <PageHeader order={orderData} annexLabel="ANNEXURE - A (1/2)" />

<div className="mt-3 flex-1 flex flex-col">
                <SectionBox title="ORDER IN DETAILS" className="flex-1 flex flex-col justify-between min-h-[580px]">
<div
                      ref={detailsContentRef}
                      className="space-y-3 text-[13px] leading-relaxed text-slate-800"
                      style={detailsPaged.cap ? { maxHeight: detailsPaged.cap, overflow: 'hidden' } : undefined}
                      dangerouslySetInnerHTML={{ __html: wrappableHtml(orderData.orderInDetailsHtml) }}
                    />
                  {detailsPaged.part2Html ? (
                    <p className="mt-3 text-right text-[11px] font-bold text-slate-400">--- Continued ---</p>
                  ) : (
                    <p className="mt-3 text-right text-[11px] font-bold text-slate-400">--- End of page ---</p>
                  )}
                </SectionBox>
              </div>
            </div>

            <div ref={page2FooterRef} className="mt-3">
              <PageFooter />
            </div>
          </div>

          {/* =========================================================================
              TERMS & CONDITIONS (SUMMARY) CONTINUED — placed before the detailed T&C
          ========================================================================= */}
          {termsSummaryPaged.part2Html && (
            <PagedSection
              html={wrappableHtml(termsSummaryPaged.part2Html)}
              reserve={48}
              contentClass="space-y-1.5 text-[11px] leading-relaxed text-slate-700"
              sectionTitle="TERMS &amp; CONDITIONS (CONTINUED)"
              boxClass="rounded-md border border-black bg-white"
              titleClass="text-center border-b border-black"
              pageHeader={<PageHeader order={orderData} annexLabel="ANNEXURE - A (2/2)" />}
              pageFooter={<PageFooter />}
              continueNote={false}
            />
          )}

          {/* =========================================================================
              PAGE 3: ANNEXURE - A (2/2) TERMS & CONDITIONS
          ========================================================================= */}
<div
            className="print-page mx-auto w-full max-w-[210mm] h-[297mm] overflow-hidden bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm flex flex-col justify-between"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="flex flex-col flex-1 justify-between">
              <PageHeader order={orderData} annexLabel="ANNEXURE - A (2/2)" />

              <div className="mt-3 flex-1 flex flex-col justify-between">
                <SectionBox title="DETAILED TERMS &amp; CONDITIONS" className="flex-1">
<div
                      ref={legalTermsContentRef}
                      className="space-y-2 text-[12.5px] leading-relaxed text-slate-700"
                      style={legalPaged.cap ? { maxHeight: legalPaged.cap, overflow: 'hidden' } : undefined}
                      dangerouslySetInnerHTML={{ __html: wrappableHtml(orderData.legalTermsHtml) }}
                    />
                  {legalPaged.part2Html ? (
                    <p className="mt-2 text-right text-[11px] font-bold text-slate-400">Continued…</p>
                  ) : null}
                </SectionBox>

                {/* Final Signatures & QR Block — only on the last page (page 3 when nothing continues) */}
                <div ref={page3SigRef} className="mt-2.5">
                  {!legalPaged.part2Html && (
<SignatureBlock order={orderData} />
                  )}
                </div>
              </div>
            </div>

            <div ref={page3FooterRef} className="mt-2.5">
              <PageFooter />
            </div>
          </div>

          {/* =========================================================================
              CONTINUED PAGES (only rendered when a section overflows)
              Each renders on an A4 page and paginates itself recursively so a
              very long section never clips.
          ========================================================================= */}
          {summaryPaged.part2Html && (
            <PagedSection
              html={wrappableHtml(summaryPaged.part2Html)}
              reserve={48}
              contentClass="space-y-1.5 text-[13px] leading-relaxed text-black"
              sectionTitle="ORDER SUMMARY (CONTINUED)"
              boxClass="rounded-md border border-black bg-white"
              titleClass="text-center border-b border-black"
              pageHeader={<PageHeader order={orderData} annexLabel="ANNEXURE - A (1/2)" />}
              pageFooter={<PageFooter />}
              continueNote={false}
            />
          )}

          {detailsPaged.part2Html && (
            <PagedSection
              html={wrappableHtml(detailsPaged.part2Html)}
              reserve={64}
              contentClass="space-y-3 text-[13px] leading-relaxed text-slate-800"
              sectionTitle="ORDER IN DETAILS (CONTINUED)"
              boxClass="rounded-md border border-black bg-white"
              titleClass="text-center border-b border-black"
              pageHeader={<PageHeader order={orderData} annexLabel="ANNEXURE - A (2/2)" />}
              pageFooter={<PageFooter />}
              pageFooterWrapClass="mt-3"
              continueNote={false}
            />
          )}

          {legalPaged.part2Html && (
            <PagedSection
              html={wrappableHtml(legalPaged.part2Html)}
              reserve={64}
              contentClass="space-y-2 text-[12.5px] leading-relaxed text-slate-700"
              sectionTitle="DETAILED TERMS &amp; CONDITIONS (CONTINUED)"
              boxClass="rounded-md border border-black bg-white"
              titleClass="text-center border-b border-black"
              pageHeader={<PageHeader order={orderData} annexLabel="ANNEXURE - A (2/2)" />}
              pageFooter={<PageFooter />}
              continueNote={false}
              endBlock={<SignatureBlock order={orderData} />}
            />
          )}
        </div>
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
