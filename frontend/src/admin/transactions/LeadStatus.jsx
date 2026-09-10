import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import Layout from '../../Layout/Layout'
import { can } from '../../utils/permissions'
import Spinner from '../../components/Spinner'

const STAGE_STYLES = {
  raw: 'bg-slate-100 text-slate-700 border-slate-200',
  assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  quotation: 'bg-amber-50 text-amber-700 border-amber-200',
  order: 'bg-blue-50 text-blue-700 border-blue-200',
  client: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function LockIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UnlockIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

export default function LeadStatus() {
  const { user } = useAuth()
  const [leads, setLeads] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStage, setSelectedStage] = useState('All Stages')
  const [toastMessage, setToastMessage] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get('/transactions/leads/my/')
      .then((data) => {
        if (!cancelled) setLeads(data)
      })
      .catch(() => {
        if (!cancelled) setLeads([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2500)
  }

  const isAdmin = can(user, 'leads.manage_lock')

  function canManageLock(lead) {
    return isAdmin || lead.assignedTo === user?.name
  }

  async function toggleLock(lead) {
    if (busyId) return
    setBusyId(lead.id)
    try {
      const action = lead.isLocked ? 'unlock' : 'lock'
      const updated = await api.post(`/transactions/leads/${lead.id}/${action}/`, {})
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, ...updated } : l)))
      showToast(lead.isLocked ? 'Lead unlocked.' : 'Lead locked.')
    } catch (err) {
      showToast(err.message || 'Could not update lock.')
    } finally {
      setBusyId(null)
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStage = selectedStage === 'All Stages' || lead.stage === selectedStage
      const matchesSearch =
        lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.phone || '').includes(searchQuery) ||
        lead.id.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStage && matchesSearch
    })
  }, [leads, selectedStage, searchQuery])

  return (
    <Layout>
      <div className="space-y-4">
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="text-xs font-semibold text-slate-800">{toastMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Lead Status</h1>
            <p className="text-xs text-slate-500">
              See where each of your leads stands across the pipeline — raw, tele-call, quotation, order or converted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option>All Stages</option>
              <option value="raw">Raw</option>
              <option value="assigned">Tele Call</option>
              <option value="quotation">Quotation</option>
              <option value="order">Order</option>
              <option value="client">Converted</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company / contact / phone…"
              className="w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-16 text-center">
            <p className="text-sm font-semibold text-slate-600">No leads found</p>
            <p className="text-xs text-slate-400">Lead will show here once added by you or assigned to you.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-semibold">Lead</th>
                  <th className="px-4 py-3 font-semibold">Stage</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Added By</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 text-right font-semibold">Lock</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const lockable = canManageLock(lead)
                  return (
                    <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{lead.company}</p>
                        <p className="text-[11px] text-slate-400">
                          {lead.id}
                          {lead.contact ? ` · ${lead.contact}` : ''}
                          {lead.phone ? ` · ${lead.phone}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${STAGE_STYLES[lead.stage] || 'bg-slate-100 text-slate-700'}`}>
                          {lead.stageLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-700">{lead.detail || lead.callStatus || '—'}</p>
                        {lead.displayDate && <p className="text-[11px] text-slate-400">{lead.displayDate}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.addedBy || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.assignedTo || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleLock(lead)}
                          disabled={!lockable || busyId === lead.id}
                          title={
                            lead.isLocked
                              ? lockable
                                ? 'Unlock this lead'
                                : `Locked by ${lead.lockedBy || 'an admin'}`
                              : lockable
                                ? 'Lock this lead'
                                : 'Locked leads can only be reassigned by admins'
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            lead.isLocked
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                          }`}
                        >
                          {lead.isLocked ? <LockIcon /> : <UnlockIcon />}
                          {lead.isLocked ? 'Locked' : 'Lock'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}