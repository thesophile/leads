import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function SendIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
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

function CopyIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function MailIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function WhatsAppIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function BellIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export default function SendForApprovalModal({
  open,
  quote,
  approverOptions = [],
  onClose,
  onSent,
  onToast,
}) {
  const [step, setStep] = useState(1) // 1: Select Approver, 2: Send Methods
  const [selectedApproverId, setSelectedApproverId] = useState(null)
  const [channels, setChannels] = useState(['app', 'email', 'whatsapp'])
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const toast = onToast || (() => {})

  // Reset or initialize when opened
  useEffect(() => {
    if (open) {
      setStep(1)
      setError('')
      setCopied(false)
      setGeneratedLink('')
      setSearchTerm('')
      // Pick first available approver if any
      if (approverOptions.length > 0) {
        setSelectedApproverId(approverOptions[0].id)
      } else {
        setSelectedApproverId(null)
      }
    }
  }, [open, approverOptions])

  const selectedApprover = approverOptions.find((a) => a.id === selectedApproverId)

  // Adjust default channels based on selected approver's contact info
  useEffect(() => {
    if (selectedApprover) {
      const active = ['app']
      if (selectedApprover.email) active.push('email')
      if (selectedApprover.phone) active.push('whatsapp')
      setChannels(active)
      setCustomMessage(
        `Hi ${selectedApprover.name}, quotation ${quote?.id || ''} for ${quote?.company || ''} is awaiting your approval.`
      )
    }
  }, [selectedApproverId, quote])

  if (!open || !quote) return null

  function toggleChannel(channel) {
    if (channel === 'app') return // In-app is always required
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    )
  }

  const filteredApprovers = approverOptions.filter((a) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      a.name.toLowerCase().includes(term) ||
      (a.role && a.role.toLowerCase().includes(term)) ||
      (a.email && a.email.toLowerCase().includes(term)) ||
      (a.phone && a.phone.includes(term))
    )
  })

  async function fetchApprovalLink() {
    if (generatedLink) return generatedLink
    if (!selectedApproverId) return ''
    try {
      const res = await api.post(
        `/transactions/quotations/${encodeURIComponent(quote.id)}/approval-link/`,
        {
          approver_id: selectedApproverId,
          origin: window.location.origin,
        }
      )
      if (res?.link) {
        setGeneratedLink(res.link)
        return res.link
      }
    } catch (err) {
      setError(err.message || 'Failed to generate approval link.')
    }
    return ''
  }

  async function handleCopyLink() {
    setError('')
    setCopying(true)
    try {
      const link = await fetchApprovalLink()
      if (link) {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        toast('✓ Approval link copied to clipboard.')
        setTimeout(() => setCopied(false), 3000)
      }
    } catch {
      toast('Could not copy link automatically.')
    } finally {
      setCopying(false)
    }
  }

  async function handleConfirmSend() {
    if (!selectedApproverId) {
      setError('Please select an approver.')
      return
    }
    setError('')
    setSending(true)

    try {
      const chosen = approverOptions.filter((a) => a.id === selectedApproverId)
      const approverNames = chosen.map((a) => a.name).join(', ')

      const data = await api.put(`/transactions/quotations/${encodeURIComponent(quote.id)}/`, {
        status: 'Pending Approval',
        approvers: [selectedApproverId],
        channels,
        origin: window.location.origin,
        message: customMessage,
        remarks: `Sent to ${approverNames} for approval`,
      })

      const link = data.approvalLink || `${window.location.origin}/approval/${data.approvalToken}`

      // If WhatsApp channel is selected, open WhatsApp directly
      if (channels.includes('whatsapp') && selectedApprover?.phone) {
        const digits = String(selectedApprover.phone).replace(/[^0-9]/g, '')
        const text = encodeURIComponent(
          `${customMessage || `Quotation ${quote.id} is awaiting your approval.`}\n\nReview & Approve: ${link}`
        )
        window.open(`https://wa.me/${digits}?text=${text}`, '_blank')
      }

      toast(`✓ Proposal sent to ${approverNames} for approval.`)
      onSent?.(data)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to send for approval.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose()
      }}
    >
      <div className="w-full max-w-lg my-8 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-xs">
              <SendIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Send for Approval</h3>
              <p className="text-[11px] text-slate-500">
                {step === 1 ? 'Step 1 of 2: Select Approver' : 'Step 2 of 2: Send Methods & Channels'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Proposal Summary Card */}
        <div className="px-5 pt-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                  {quote.id}
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                  {quote.company}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {quote.customer} • {quote.currency || '₹'} {quote.netAmount || quote.total}
                </p>
              </div>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-slate-600">
                {quote.status || 'Draft'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Select Approving Admin <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {approverOptions.length} available
                </span>
              </div>

              {approverOptions.length > 4 && (
                <div className="mb-2.5">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search approver by name, role or email…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}

              <div className="rounded-xl border border-slate-300 bg-white divide-y divide-slate-100 max-h-60 overflow-y-auto shadow-xs">
                {filteredApprovers.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-400">
                    No matching approvers found.
                  </p>
                ) : (
                  filteredApprovers.map((admin) => {
                    const checked = selectedApproverId === admin.id
                    return (
                      <label
                        key={admin.id}
                        className={`flex items-center gap-3 px-3.5 py-3 text-xs cursor-pointer transition ${
                          checked ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="approver"
                          checked={checked}
                          onChange={() => setSelectedApproverId(admin.id)}
                          className="h-4 w-4 rounded-full border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 truncate">
                              {admin.name}
                            </span>
                            {admin.is_superuser && (
                              <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700">
                                Super Admin
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-slate-400">
                            <span>{admin.role || 'Approver'}</span>
                            {admin.email && <span>• {admin.email}</span>}
                            {admin.phone && <span>• {admin.phone}</span>}
                          </div>
                        </div>
                        {checked && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/70 rounded-full px-2 py-0.5">
                            ✓ Selected
                          </span>
                        )}
                      </label>
                    )
                  })
                )}
              </div>
              <p className="mt-2 text-[10.5px] text-slate-400 leading-relaxed">
                The selected administrator must authorize this commercial proposal before it can be shared with the client.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Selected Approver Info Card */}
              {selectedApprover && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Approving Admin
                    </span>
                    <span className="text-xs font-bold text-slate-900 block truncate mt-0.5">
                      {selectedApprover.name}
                    </span>
                    <span className="text-[10.5px] text-slate-500 block truncate mt-0.5">
                      {selectedApprover.role || 'Approver'}
                      {selectedApprover.email ? ` • ${selectedApprover.email}` : ''}
                      {selectedApprover.phone ? ` • ${selectedApprover.phone}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline ml-3 shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Send Methods Section */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-2">
                  Send Methods & Channels
                </label>
                <div className="rounded-xl border border-slate-300 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {/* Channel 1: In-App Notification (Always enabled) */}
                  <div className="flex items-start gap-3 p-3 bg-slate-50/40">
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 cursor-not-allowed opacity-80"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <BellIcon className="h-3.5 w-3.5 text-brand-600" />
                          In-App Notification
                        </span>
                        <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-bold">
                          Always Sent
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-slate-500 leading-snug">
                        Approver receives in-app notifications and approval actions directly in LEADS.
                      </p>
                    </div>
                  </div>

                  {/* Channel 2: Email */}
                  <label
                    className={`flex items-start gap-3 p-3 transition ${
                      selectedApprover?.email
                        ? 'cursor-pointer hover:bg-slate-50'
                        : 'opacity-50 cursor-not-allowed bg-slate-50/20'
                    }`}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={channels.includes('email')}
                        disabled={!selectedApprover?.email}
                        onChange={() => toggleChannel('email')}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <MailIcon className="h-3.5 w-3.5 text-slate-600" />
                          Send Email
                        </span>
                        {selectedApprover?.email && (
                          <span className="text-[10.5px] font-mono text-slate-500 truncate max-w-[200px]">
                            ({selectedApprover.email})
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-slate-500 leading-snug">
                        {selectedApprover?.email
                          ? 'Sends the quotation details and direct review link to the approver’s email.'
                          : 'No email address registered for this approver.'}
                      </p>
                    </div>
                  </label>

                  {/* Channel 3: WhatsApp */}
                  <label
                    className={`flex items-start gap-3 p-3 transition ${
                      selectedApprover?.phone
                        ? 'cursor-pointer hover:bg-slate-50'
                        : 'opacity-50 cursor-not-allowed bg-slate-50/20'
                    }`}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={channels.includes('whatsapp')}
                        disabled={!selectedApprover?.phone}
                        onChange={() => toggleChannel('whatsapp')}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                          Send via WhatsApp
                        </span>
                        {selectedApprover?.phone && (
                          <span className="text-[10.5px] font-mono text-slate-500">
                            ({selectedApprover.phone})
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-slate-500 leading-snug">
                        {selectedApprover?.phone
                          ? 'Opens WhatsApp with a pre-filled message carrying the direct approval link.'
                          : 'No mobile phone registered for this approver.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Direct Share / Copy Link Button */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    Direct Approval Link
                  </span>
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                    No sign-in required • OTP protected
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  Anyone with this link can review the proposal details and authorize approval using an email OTP.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={copying}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-3.5 w-3.5 text-slate-500" />
                        <span>{copying ? 'Generating link…' : 'Copy Direct Approval Link'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Optional Custom Message */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Message / Note for Approver <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any specific context or urgency..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-600 animate-in fade-in">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/70">
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={sending}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selectedApproverId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>Next: Send Methods →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={!selectedApproverId || sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendIcon className="h-3.5 w-3.5" />
                <span>{sending ? 'Sending…' : 'Send for Approval'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
