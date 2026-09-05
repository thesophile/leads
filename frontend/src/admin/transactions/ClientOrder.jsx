import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const WEB_URL_RE = /(https?:\/\/[^\s]+)/g

function Linkify({ text }) {
  const parts = String(text || '').split(WEB_URL_RE)
  return parts.map((part, idx) =>
    WEB_URL_RE.test(part) ? (
      <a key={idx} href={part} target="_blank" rel="noreferrer" className="text-brand-600 underline hover:text-brand-700">
        {part}
      </a>
    ) : (
      <span key={idx}>{part}</span>
    )
  )
}

export default function ClientOrder() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [decision, setDecision] = useState(() => {
    const action = searchParams.get('action')
    return action === 'accept' || action === 'decline' ? action : null
  })
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [done, setDone] = useState(false)

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
  const responded = data && data.clientStatus && data.clientStatus !== 'Pending'

  async function handleSubmit() {
    if (!decision) return
    setSubmitting(true)
    setActionError('')
    try {
      const d = await api.post(
        `/transactions/public/orders/${encodeURIComponent(token)}/respond/`,
        { decision, message: message.trim() }
      )
      setData(d)
      setDone(true)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function decisionCopy() {
    if (decision === 'accept') return { word: 'Accept', verb: 'accepted', cls: 'bg-emerald-600 hover:bg-emerald-700', ring: 'ring-emerald-500 border-emerald-500' }
    if (decision === 'decline') return { word: 'Decline', verb: 'declined', cls: 'bg-rose-600 hover:bg-rose-700', ring: 'ring-rose-500 border-rose-500' }
    return { word: '', verb: '', cls: '', ring: '' }
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
            <XIcon />
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
  const chosen = decisionCopy()

  return (
    <div className="min-h-screen bg-slate-50">
      {responded || done ? (
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                d.clientStatus === 'Accepted'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {d.clientStatus === 'Accepted' ? <CheckIcon /> : <XIcon />}
            </div>
            <h1 className="mt-4 text-lg font-bold text-slate-900">
              {d.clientStatus === 'Accepted' ? 'Order accepted' : 'Order declined'}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {d.company} • {d.id}
            </p>
            {d.clientMessage && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Your message
                </p>
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                  <Linkify text={d.clientMessage} />
                </p>
              </div>
            )}
            {d.clientRespondedAt && (
              <p className="mt-4 text-[11px] text-slate-400">
                Responded on {new Date(d.clientRespondedAt).toLocaleString()}
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Our team has been notified. Thank you for your response.
            </p>
          </div>
        </div>
      ) : (
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

            {/* Decision card */}
            <div className="border-t border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-slate-900">Your decision</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Review the order form above, then accept or decline it. You can add a comment for
                our team if you wish.
              </p>

              <label className="mt-4 block text-[11px] font-bold text-slate-700 mb-1">
                Comments <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Type any questions, clarifications or message for the team..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />

              {actionError && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {actionError}
                </div>
              )}

              {!decision ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActionError('')
                      setDecision('accept')
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer active:scale-[0.98]"
                  >
                    <CheckIcon />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError('')
                      setDecision('decline')
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-5 py-3 text-sm font-bold text-rose-600 shadow-sm hover:bg-rose-50 transition cursor-pointer active:scale-[0.98]"
                  >
                    <XIcon />
                    Decline
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Reviewing to <span className={decision === 'accept' ? 'text-emerald-600' : 'text-rose-600'}>{chosen.word.toLowerCase()}</span>
                      </p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        Confirm your {chosen.word.toLowerCase()} to submit your response. This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDecision(null)}
                        disabled={submitting}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-60 ${chosen.cls}`}
                      >
                        {submitting ? 'Submitting…' : `Confirm ${chosen.word}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-[11px] text-slate-400 leading-relaxed">
            {[d.companyName, d.companyAddress, d.companyPhone, d.companyEmail]
              .filter(Boolean)
              .join(' • ') || '— LEADS'}
          </p>
        </div>
      )}
    </div>
  )
}