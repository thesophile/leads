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

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/**
 * Reusable "Send to Client" modal for order forms.
 *
 * Lets the user email the order, open WhatsApp with the client link, or copy
 * the client decision page link. On a successful actual send it calls
 * ``onSent`` with an updated order (status now "Sent to Client").
 *
 * Rendered only while ``open`` is true, so internal state starts fresh each time.
 */
export default function SendToClientModal({ item, open, onClose, onSent, onToast }) {
  const [channels, setChannels] = useState(() => (item?.email ? ['email'] : []))
  const [message, setMessage] = useState(
    item?.customer
      ? `Dear ${item.customer}, please find our order form for ${item.company}.`
      : ''
  )
  const [sending, setSending] = useState(false)
  const [copying, setCopying] = useState(false)

  const toast = onToast || (() => {})

  if (!open || !item) return null

  const order = item

  function toggleChannel(channel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    )
  }

  async function handleConfirmSend() {
    if (channels.length === 0) return
    setSending(true)
    try {
      const data = await api.post(
        `/transactions/orders/${encodeURIComponent(order.id)}/send-to-client/`,
        {
          channels,
          origin: window.location.origin,
          message,
        }
      )
      const link = data.link
      if (channels.includes('whatsapp') && data.mobile) {
        const digits = String(data.mobile).replace(/[^0-9]/g, '')
        const text = encodeURIComponent(`${message || 'Your order form is ready.'}\n\n${link}`)
        window.open(`https://wa.me/${digits}?text=${text}`, '_blank')
      }
      toast(channels.includes('email') ? '✓ Order sent to the client.' : '✓ Order link ready to share.')
      onSent?.({ ...order, status: 'Sent to Client' })
      onClose()
    } catch (err) {
      setSending(false)
      toast(err.message, 'error')
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
            <h3 className="text-sm font-bold text-slate-900">Send to Client</h3>
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
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                  order.status === 'Accepted'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {order.status === 'Accepted' ? 'Accepted' : order.status || 'Sent to Client'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
              Send via
            </label>
            <div className="rounded-lg border border-slate-300 bg-white divide-y divide-slate-100">
              <label
                className={`flex items-center gap-2.5 px-3 py-2.5 text-xs cursor-pointer ${
                  order.email ? 'hover:bg-slate-50' : 'opacity-45 pointer-events-none'
                } transition`}
              >
                <input
                  type="checkbox"
                  checked={channels.includes('email')}
                  onChange={() => toggleChannel('email')}
                  disabled={!order.email}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-800">Email</span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    {order.email || 'No email address on this order'}
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
              <div className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={copying}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copying ? 'Generating…' : 'Copy link'}</span>
                </button>
                <p className="mt-1.5 text-[10px] text-slate-400 text-center">
                  Copies the client decision page link without sending anything.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
              Message <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Personal note to include with the order..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1.5 text-[10.5px] text-slate-400 leading-relaxed">
              Shown in the email and WhatsApp text. The client can still add their own comments
              when responding.
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