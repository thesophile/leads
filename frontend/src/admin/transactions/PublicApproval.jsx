import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { proposalItemsFromHtml, fmtAmount, currencySymbol, htmlToFormattedLines } from './proposalItemsUtils'

function CheckIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ShieldCheckIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function MailIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function htmlToPlainLines(html) {
  const raw = String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\r\n?/g, '\n')

  const lines = []
  for (const line of raw.split('\n')) {
    const text = line.trim()
    if (text === '' && (lines.length === 0 || lines[lines.length - 1] === '')) continue
    lines.push(text)
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

export default function PublicApproval() {
  const { token } = useParams()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Approval action states
  const [activeTab, setActiveTab] = useState('approve') // 'approve' | 'reject'
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [approvalNote, setApprovalNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get(`/transactions/public/approval/${encodeURIComponent(token)}/`)
        if (!cancelled) {
          setData(res)
          if (res.approval?.otpSent) {
            setOtpSent(true)
          }
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load approval details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const q = data?.quotation
  const a = data?.approval
  const currency = useMemo(() => currencySymbol(q?.currency), [q?.currency])

  const scopeSplit = useMemo(() => proposalItemsFromHtml(q?.proposalScope || ''), [q?.proposalScope])
  const detailsSplit = useMemo(() => proposalItemsFromHtml(q?.termsConditions || ''), [q?.termsConditions])
  const termsSummaryHtml = q?.termsSummaryHtml || q?.companyTerms || ''
  const termsFullHtml = q?.termsFullHtml && q.termsFullHtml !== termsSummaryHtml ? q.termsFullHtml : ''
  const hasDetails = Boolean(
    (detailsSplit.freeHtml && detailsSplit.freeHtml.trim()) ||
    detailsSplit.items.length > 0
  )

  async function handleSendOtp() {
    setActionError('')
    setActionSuccess('')
    setSendingOtp(true)
    try {
      const res = await api.post(`/transactions/public/approval/${encodeURIComponent(token)}/otp/`, {})
      if (res?.sent === false || res?.detail) {
        setActionError(res?.detail || 'Failed to send one-time approval code.')
        return
      }
      setOtpSent(true)
      setActionSuccess(`A 6-digit approval code was sent to ${res?.email || a?.approverEmail || 'your email'}.`)
    } catch (err) {
      setActionError(err.message || 'Could not send approval code. Please try again.')
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleConfirmApprove() {
    if (!otp.trim() || otp.trim().length !== 6) {
      setActionError('Please enter the 6-digit approval code.')
      return
    }
    setActionError('')
    setActionSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post(`/transactions/public/approval/${encodeURIComponent(token)}/approve/`, {
        otp: otp.trim(),
        note: approvalNote.trim(),
      })
      setData((prev) => ({
        ...prev,
        quotation: { ...prev.quotation, status: res.quotationStatus || 'Approved' },
        approval: {
          ...prev.approval,
          status: 'Approved',
          signedBy: res.signedBy,
          signedAt: res.signedAt,
          signatureRef: res.signatureRef,
        },
      }))
      setActionSuccess('✓ Proposal successfully approved!')
    } catch (err) {
      setActionError(err.message || 'Approval failed. Please check the OTP.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmReject() {
    if (!rejectionReason.trim()) {
      setActionError('Please provide a reason for rejecting the proposal.')
      return
    }
    setActionError('')
    setActionSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post(`/transactions/public/approval/${encodeURIComponent(token)}/reject/`, {
        reason: rejectionReason.trim(),
      })
      setData((prev) => ({
        ...prev,
        quotation: { ...prev.quotation, status: res.quotationStatus || 'Rejected' },
        approval: {
          ...prev.approval,
          status: 'Rejected',
          rejectionReason: res.rejectionReason || rejectionReason.trim(),
        },
      }))
      setActionSuccess('✓ Proposal has been marked as rejected.')
    } catch (err) {
      setActionError(err.message || 'Rejection failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
          <Spinner className="h-4 w-4 text-brand-600" />
          <span>Loading approval details…</span>
        </div>
      </div>
    )
  }

  if (loadError || !data || !q) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <XIcon />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">Approval Link Invalid or Expired</h2>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            {loadError || 'This approval request does not exist, has expired, or was already resolved.'}
          </p>
        </div>
      </div>
    )
  }

  const isDecided = a?.status === 'Approved' || a?.status === 'Rejected'

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white shadow-2xs sticky top-0 z-30">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {q.companyLogo ? (
              <img
                src={q.companyLogo}
                alt={q.companyName || 'Company logo'}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                {q.companyName || 'LEADS'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
              <span>Official Approval Portal</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Banner if Decided */}
        {a?.status === 'Approved' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <CheckIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-emerald-950">
                  This Proposal has been Approved
                </h2>
                <p className="mt-0.5 text-xs text-emerald-800 leading-relaxed">
                  Authorized by <span className="font-semibold">{a.signedBy || a.approverName}</span>
                  {a.signedAt ? ` on ${new Date(a.signedAt).toLocaleString()}` : ''}.
                </p>
                {a.signatureRef && (
                  <p className="mt-1 font-mono text-[10.5px] text-emerald-700">
                    Signature Ref: {a.signatureRef}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {a?.status === 'Rejected' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                <XIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-rose-950">Proposal Rejected</h2>
                <p className="mt-0.5 text-xs text-rose-800 leading-relaxed">
                  This proposal was not approved.
                </p>
                {a.rejectionReason && (
                  <div className="mt-2 rounded-lg bg-white/70 border border-rose-200 p-2.5 text-xs text-rose-900">
                    <span className="font-bold">Reason:</span> {a.rejectionReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Proposal Header Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="font-mono text-[11px] font-bold text-brand-600 uppercase tracking-wider">
                Commercial Proposal #{q.id}
              </span>
              <h1 className="mt-1 text-lg sm:text-xl font-bold text-slate-900">
                {q.company}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Customer: <span className="font-semibold text-slate-700">{q.customer}</span>
                {q.city ? ` • ${q.city}` : ''}
                {q.date ? ` • Date: ${q.date}` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Net Amount
              </span>
              <p className="mt-0.5 text-xl sm:text-2xl font-black text-slate-900">
                {currency} {fmtAmount(q.netAmount || q.total || 0)}
              </p>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                    q.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : q.status === 'Rejected'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {q.status}
                </span>
              </div>
            </div>
          </div>

          {/* Submitter & Approver metadata */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Submitted By
              </span>
              <p className="mt-0.5 font-semibold text-slate-800">
                {q.submittedBy || 'Sales Executive'}
              </p>
              {q.approvalRequestedAt && (
                <p className="mt-0.5 text-[10.5px] text-slate-400">
                  {new Date(q.approvalRequestedAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Designated Approver
              </span>
              <p className="mt-0.5 font-semibold text-slate-800">
                {a.approverName} {a.approverRole ? `(${a.approverRole})` : ''}
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">
                {a.approverEmail}
              </p>
            </div>
          </div>
        </section>

        {/* 1. Proposal Summary */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Proposal Summary
            </h2>
            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
              Scope &amp; Deliverables
            </span>
          </div>

          {/* Free text in scope */}
          {scopeSplit.freeHtml && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
                {htmlToFormattedLines(scopeSplit.freeHtml).map((line, idx) => (
                  <p key={idx} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                ))}
              </div>
            </div>
          )}

          {/* Service items table */}
          {scopeSplit.items.filter((it) => it.type === 'service').length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopeSplit.items
                    .filter((it) => it.type === 'service')
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{item.title}</div>
                          {item.desc && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                          {item.amount ? fmtAmount(item.amount) : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Text blocks in scope */}
          {scopeSplit.items
            .filter((it) => it.type === 'text')
            .map((it, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-700 whitespace-pre-line">
                {it.text}
              </div>
            ))}

          {/* Totals Summary */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {currency} {fmtAmount(q.total || 0)}
                </span>
              </div>
              {q.discount && q.discount !== '0' && q.discount !== '0.00' && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono font-semibold">- {currency} {fmtAmount(q.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Net Total:</span>
                <span className="font-mono">
                  {currency} {fmtAmount(q.netAmount || q.total || 0)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. T&C Summary */}
        {termsSummaryHtml && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Terms &amp; Conditions (Summary)
              </h2>
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                T&amp;C Summary
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {htmlToFormattedLines(termsSummaryHtml).map((line, idx) => (
                <p key={idx} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Proposal in Details */}
        {hasDetails && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Proposal in Details
              </h2>
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                Specifications
              </span>
            </div>

            {/* Free text in details */}
            {detailsSplit.freeHtml && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                  {htmlToFormattedLines(detailsSplit.freeHtml).map((line, idx) => (
                    <p key={idx} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Service items in details */}
            {detailsSplit.items.filter((it) => it.type === 'service').length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Specification / Service</th>
                      <th className="px-4 py-3 text-right">Amount ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailsSplit.items
                      .filter((it) => it.type === 'service')
                      .map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{item.title}</div>
                            {item.desc && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                            {item.amount ? fmtAmount(item.amount) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Text blocks in details */}
            {detailsSplit.items
              .filter((it) => it.type === 'text')
              .map((it, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-700 whitespace-pre-line">
                  {it.text}
                </div>
              ))}
          </section>
        )}

        {/* 4. T&C in Details */}
        {termsFullHtml && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Detailed Terms &amp; Conditions
              </h2>
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                T&amp;C in Details
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {htmlToFormattedLines(termsFullHtml).map((line, idx) => (
                <p key={idx} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
              ))}
            </div>
          </section>
        )}

        {/* 5. Proposal Decision */}
        {!isDecided ? (
          <section className="rounded-2xl border-2 border-brand-500/30 bg-white p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4 text-brand-600" />
                  Proposal Decision
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  You are authorized as <span className="font-semibold text-slate-800">{a.approverName}</span> to decide on this proposal.
                </p>
              </div>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('approve')
                    setActionError('')
                  }}
                  className={`rounded-md px-3 py-1.5 transition cursor-pointer ${
                    activeTab === 'approve'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reject')
                    setActionError('')
                  }}
                  className={`rounded-md px-3 py-1.5 transition cursor-pointer ${
                    activeTab === 'reject'
                      ? 'bg-white text-rose-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✗ Reject
                </button>
              </div>
            </div>

            {/* Error / Success Notifications */}
            {actionError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 animate-in fade-in">
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700 animate-in fade-in">
                {actionSuccess}
              </div>
            )}

            {/* Tab 1: Approve Flow with OTP */}
            {activeTab === 'approve' && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  To approve this proposal, a one-time verification code (OTP) must be sent to your registered email address ({a.approverEmail}).
                </p>

                {!otpSent ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
                    <p className="text-xs text-slate-500 mb-3">
                      Click below to generate and email your 6-digit approval code.
                    </p>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer active:scale-98 disabled:opacity-60"
                    >
                      {sendingOtp ? <Spinner className="h-4 w-4" /> : <MailIcon className="h-4 w-4" />}
                      <span>{sendingOtp ? 'Sending code…' : 'Send One-Time Code to Email'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          6-Digit Approval Code <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp}
                          className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 underline cursor-pointer disabled:opacity-50"
                        >
                          {sendingOtp ? 'Sending…' : 'Resend Code'}
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-xl font-mono font-bold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <p className="mt-1.5 text-[10.5px] text-slate-400">
                        Code expires in 5 minutes and can only be used once.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Approval Note <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                        placeholder="Add an internal approval note or instructions..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmApprove}
                      disabled={otp.length !== 6 || submitting}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition cursor-pointer active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? <Spinner className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                      <span>{submitting ? 'Verifying & Approving…' : 'Verify & Approve Proposal'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Reject Flow */}
            {activeTab === 'reject' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Reason for Rejection <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    autoFocus
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify why this proposal cannot be approved or what changes are required..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <p className="mt-1 text-[10.5px] text-slate-400">
                    The reason will be visible to the sales representative who submitted the proposal.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('approve')}
                    disabled={submitting}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReject}
                    disabled={!rejectionReason.trim() || submitting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <Spinner className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
                    <span>{submitting ? 'Rejecting…' : 'Confirm Rejection'}</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-slate-600" />
              Proposal Decision
            </h2>
            <div className="mt-4">
              {q.status === 'Approved' ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900">
                  <p className="font-bold text-emerald-950 text-sm">✓ This Proposal is Approved</p>
                  <p className="mt-1 text-emerald-800">
                    Authorized by <span className="font-semibold">{a.signedBy || a.approverName}</span>
                    {a.signedAt ? ` on ${new Date(a.signedAt).toLocaleString()}` : ''}.
                  </p>
                  {a.signatureRef && (
                    <p className="mt-1 font-mono text-[11px] text-emerald-700">Signature Ref: {a.signatureRef}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900">
                  <p className="font-bold text-rose-950 text-sm">✗ This Proposal was Rejected</p>
                  {a.rejectionReason && (
                    <p className="mt-1 text-rose-800">
                      <span className="font-semibold">Reason:</span> {a.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Company contact info footer */}
        <footer className="text-center text-xs text-slate-400 py-4 space-y-1">
          <p>{q.companyName || 'LEADS Application'}</p>
          {(q.companyAddress || q.companyEmail || q.companyPhone) && (
            <p className="text-[11px]">
              {[q.companyAddress, q.companyEmail, q.companyPhone, q.companyWebsite].filter(Boolean).join(' • ')}
            </p>
          )}
        </footer>
      </main>
    </div>
  )
}
