import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'

const EMPTY = []

function BellIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function TypeIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function PaymentIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}

function PhoneIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function ClockIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function OrderIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function InfoIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

const TYPE_META = {
  Approval: { icon: TypeIcon, bg: 'bg-blue-50 text-blue-600' },
  Payment: { icon: PaymentIcon, bg: 'bg-emerald-50 text-emerald-600' },
  'Follow-up': { icon: PhoneIcon, bg: 'bg-indigo-50 text-indigo-600' },
  Reminder: { icon: ClockIcon, bg: 'bg-amber-50 text-amber-600' },
  Order: { icon: OrderIcon, bg: 'bg-purple-50 text-purple-600' },
  System: { icon: InfoIcon, bg: 'bg-slate-100 text-slate-500' },
}

const TYPE_BADGE = {
  Approval: 'bg-blue-50 text-blue-700 border-blue-200',
  Payment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Follow-up': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Reminder: 'bg-amber-50 text-amber-700 border-amber-200',
  Order: 'bg-purple-50 text-purple-700 border-purple-200',
  System: 'bg-slate-50 text-slate-600 border-slate-200',
}

const TABS = ['All', 'Unread']

function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} minute${min > 1 ? 's' : ''} ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} day${day > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString()
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(EMPTY)
  const [activeTab, setActiveTab] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get('/notifications/')
        if (!cancelled) setNotifications(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setNotifications([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const visible = useMemo(
    () => (activeTab === 'Unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, activeTab]
  )

  async function toggleRead(item) {
    if (item.url) {
      navigate(item.url)
      if (!item.read) markRead(item.id, true)
      return
    }
    markRead(item.id, !item.read)
  }

  async function markRead(id, read) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)))
    try {
      await api.patch(`/notifications/${id}/`, { read })
    } catch {
      // ignore network hiccups
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.post('/notifications/read-all/', {})
    } catch {
      // ignore
    }
  }

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500 mt-1">
              Approvals, follow-ups, orders and system alerts
            </p>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckIcon />
            Mark all as read
          </button>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
              {tab === 'Unread' && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <BellIcon className="h-6 w-6" />
              </span>
              <p className="text-xs font-semibold text-slate-500">Loading notifications…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <BellIcon className="h-6 w-6" />
              </span>
              <p className="text-xs font-semibold text-slate-500">No notifications here</p>
              <p className="text-[11px] text-slate-400">
                {activeTab === 'Unread' ? 'You are all caught up.' : 'New alerts will appear in this list.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((n) => {
                const meta = TYPE_META[n.type] || TYPE_META.System
                const Icon = meta.icon
                const when = n.created ? relativeTime(n.created) : n.time
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => toggleRead(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                        n.read ? 'bg-white hover:bg-slate-50/70' : 'bg-brand-50/40 hover:bg-brand-50/70'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
                      >
                        <Icon />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`truncate text-xs ${n.read ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                            {n.title}
                          </p>
                          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                          {n.message}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${TYPE_BADGE[n.type] || TYPE_BADGE.System}`}>
                            {n.type}
                          </span>
                          <span className="text-[10px] text-slate-400">{when}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  )
}