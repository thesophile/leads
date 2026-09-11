import { useState } from 'react'
import { api } from '../../api/client'

function SendIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function DownloadIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CloseIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function splitAddresses(value) {
  return String(value || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.includes('@'))
}

/**
 * Reusable "Send Order Form" modal used by Manage Orders and the order preview.
 *
 * The order form is shared for reference only — no client acceptance is
 * requested. The email carries the PDF as an attachment, the WhatsApp message
 * carries the order link, and the link can be copied for any recipient.
 */
export default function SendToClientModal({ item, open, onClose, onSent, onToast }) {
  const [channels, setChannels] = useState(() => (item?.email ? ['email'] : []))
  const [message, setMessage] = useState(
    item?.customer
      ? `Dear ${item.customer}, please find our order form for ${item.company}.`
      : ''
  )
  const [toAddresses, setToAddresses] = useState(() => (item?.email ? [item.email] : []))
  const [ccAddresses, setCcAddresses] = useState([])
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [sending, setSending] = useState(false)
  const [copying, setCopying] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const toast = onToast || (() => {})

  if (!open || !item) return null

  const order = item

  function toggleChannel(channel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    )
  }

  function addTo() {
    const fresh = splitAddresses(toInput)
    if (!fresh.length) return
    setToAddresses((prev) => Array.from(new Set([...prev, ...fresh])))
    setToInput('')
  }

  function addCc() {
    const fresh = splitAddresses(ccInput)
    if (!fresh.length) return
    setCcAddresses((prev) => Array.from(new Set([...prev, ...fresh])))
    setCcInput('')
  }

  function removeTo(address) {
    setToAddresses((prev) => prev.filter((a) => a !== address))
  }

  function removeCc(address) {
    setCcAddresses((prev) => prev.filter((a) => a !== address))
  }

  async function handleConfirmSend() {
    if (channels.length === 0) return
    if (channels.includes('email') && toAddresses.length === 0) {
      toast('Add at least one recipient email address to send to.', 'error')
      return
    }
    setSending(true)
    try {
      const data = await api.post(
        `/transactions/orders/${encodeURIComponent(order.id)}/send-to-client/`,
        {
          channels,
          origin: window.location.origin,
          message,
          recipients: channels.includes('email') ? toAddresses : [],
          cc: channels.includes('email') ? ccAddresses : [],
        }
      )
      const link = data.link
      if (channels.includes('whatsapp') && data.mobile) {
        const digits = String(data.mobile).replace(/[^0-9]/g, '')
        const text = encodeURIComponent(`${message || 'Your order form is ready.'}\n\n${link}`)
        window.open(`https://wa.me/${digits}?text=${text}`, '_blank')
      }
      if (channels.includes('email') && data.email_sent === false) {
        const reason = data.email_error ? ` (${data.email_error})` : ''
        toast(`✗ Email could not be sent${reason}. Order link is ready to share.`)
        onClose()
        return
      }
      toast(channels.includes('email') ? '✓ Order form sent.' : '✓ Order link ready to share.')
      onSent?.({ ...order, status: 'Sent to Client' })
      onClose()
    } catch (err) {
      setSending(false)
      toast(err.message)
    }
  }

  async function handleCopyLink() {
    setCopying(true)
    try {
      const data = await api.post(
        `/transactions/orders/${encodeURIComponent(order.id)}/send-to-client/`,
        { channels: ['copy'], origin: window.location.origin }
      )
      try {
        await navigator.clipboard.writeText(data.link)
        toast('✓ Order link copied to clipboard.')
      } catch {
        toast(`Could not copy automatically. Link: ${data.link}`)
      }
    } catch (err) {
      toast(err.message)
    } finally {
      setCopying(false)
    }
  }

  async function handleDownloadPdf() {
    if (downloading) return
    setDownloading(true)
    try {
      await api.download(
        `/transactions/orders/${encodeURIComponent(order.id)}/pdf/`,
        `${order.id}.pdf`
      )
      toast('✓ Order form PDF downloaded.')
    } catch (err) {
      toast(err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose()
      }}
    >
      <div className="w-full max-w-md my-8 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <SendIcon className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">Share Order Form</h3>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                  {order.id}
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">{order.company}</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {order.customer} • ₹{order.netAmount}
                </p>
              </div>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-blue-700">
                {order.status || 'Pending'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                Send via
              </label>
              <span className="mb-1.5 text-[10px] text-slate-400">
                The client is not asked to accept it again.
              </span>
            </div>
            <div className="rounded-lg border border-slate-300 bg-white divide-y divide-slate-100">
              <label
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs cursor-pointer hover:bg-slate-50 transition"
              >
                <input
                  type="checkbox"
                  checked={channels.includes('email')}
                  onChange={() => toggleChannel('email')}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-800">Email</span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    {toAddresses.length
                      ? toAddresses.join(', ')
                      : 'Add a recipient email address below'}
                  </span>
                </span>
              </label>
              <label
                className={`flex items-center gap-2.5 px-3 py-2.5 text-xs cursor-pointer ${
                  order.mobile ? 'hover:bg-slate-50' : 'opacity-45 pointer-events-none'
                } transition`}
              >
                <input
                  type="checkbox"
                  checked={channels.includes('whatsapp')}
                  onChange={() => toggleChannel('whatsapp')}
                  disabled={!order.mobile}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-800">WhatsApp</span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    {order.mobile ? `+${order.mobile}` : 'No mobile number on this order'}
                  </span>
                </span>
              </label>
              <div className="px-3 py-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={copying}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copying ? 'Generating…' : 'Copy link'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <DownloadIcon className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{downloading ? 'Preparing…' : 'Download PDF'}</span>
                </button>
              </div>
              <p className="px-3 pb-2.5 text-[10px] text-slate-400">
                The copy-link opens the order form in the browser; the PDF is the official
                printable copy.
              </p>
            </div>
          </div>

          {channels.includes('email') && (
            <div className="rounded-xl border border-slate-300 bg-white p-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  To <span className="text-slate-400 font-normal">(client is prefilled)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {toAddresses.map((address) => (
                    <span
                      key={address}
                      className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700"
                    >
                      {address}
                      <button
                        type="button"
                        onClick={() => removeTo(address)}
                        className="text-brand-400 hover:text-brand-700 cursor-pointer"
                        aria-label={`Remove ${address}`}
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 flex-1 min-w-[180px]">
                    <input
                      type="text"
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          addTo()
                        }
                      }}
                      placeholder="Add recipient email…"
                      className="w-full flex-1 border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addTo}
                      disabled={!toInput.trim()}
                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                    >
                      Add
                    </button>
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Send to the client, to someone else, or both. Press Enter to add each address.
                </p>
              </div>

              {showCc ? (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Cc</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ccAddresses.map((address) => (
                      <span
                        key={address}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                      >
                        {address}
                        <button
                          type="button"
                          onClick={() => removeCc(address)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          aria-label={`Remove ${address}`}
                        >
                          <CloseIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1 flex-1 min-w-[180px]">
                      <input
                        type="text"
                        value={ccInput}
                        onChange={(e) => setCcInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            addCc()
                          }
                        }}
                        placeholder="Add Cc address…"
                        className="w-full flex-1 border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={addCc}
                        disabled={!ccInput.trim()}
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                      >
                        Add
                      </button>
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="mt-2 text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition cursor-pointer"
                >
                  + Add Cc
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
              Message <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Personal note to include with the order form..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1.5 text-[10.5px] text-slate-400 leading-relaxed">
              Shown in the email and WhatsApp text.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSend}
            disabled={channels.length === 0 || sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon className="h-3.5 w-3.5" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}