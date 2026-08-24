import { useState, useMemo, useEffect } from 'react'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import { can } from '../../utils/permissions'

const STATUSES = [
  'All Status',
  'Pending Call',
  'Interested',
  'Quotation Requested',
  'Follow Up',
  'Considering',
  'Not Reachable',
  'Busy',
  'Not Interested',
  'For Future',
]

function PhoneCallIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function UserFilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CheckCircleIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function CalendarDaysIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function HistoryIcon({ className = 'w-4 h-4 text-brand-600' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 14 14" />
    </svg>
  )
}

export default function Telecall() {
  const { user } = useAuth()
  const [telecallList, setTelecallList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const canViewAll = !!user && (can(user, 'leads.view_all') || user.is_superuser)
  const canAssign = !!user && (can(user, 'leads.assign') || user.is_superuser)

  const callerOptions = useMemo(
    () => [...new Set(telecallList.map((l) => l.assignedTo).filter(Boolean))],
    [telecallList]
  )

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const data = await api.get('/transactions/leads/?status=assigned')
        if (!cancelled) setTelecallList(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  async function refreshData() {
    setIsLoading(true)
    setError('')
    try {
      const data = await api.get('/transactions/leads/?status=assigned')
      setTelecallList(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Selected Lead for Follow-Up History
  const [selectedLeadId, setSelectedLeadId] = useState('TC-101')

  const [selectedCaller, setSelectedCaller] = useState('All Callers')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Drawer State for Call Logging & Assessment
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [activeLead, setActiveLead] = useState(null)
  const [formData, setFormData] = useState({
    assignedTo: '',
    callStatus: 'Interested',
    priority: 'Hot',
    remarks: '',
    nextFollowUpDate: '',
    nextFollowUpTime: '10:00 AM',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Currently selected lead object for History card
  const selectedLeadForHistory = useMemo(
    () => telecallList.find((item) => item.id === selectedLeadId) || telecallList[0],
    [telecallList, selectedLeadId]
  )

  // Lead counts & KPI metrics. The Telecall list only contains assigned
  // (status=assigned) leads, so all rows carry an assignee.
  const totalAssignedCount = telecallList.length
  const hotLeadsCount = useMemo(
    () => telecallList.filter((l) => l.priority === 'Hot').length,
    [telecallList]
  )
  const warmLeadsCount = useMemo(
    () => telecallList.filter((l) => l.priority === 'Warm').length,
    [telecallList]
  )
  const coldLeadsCount = useMemo(
    () => telecallList.filter((l) => l.priority === 'Cold').length,
    [telecallList]
  )

  function openDrawer() {
    setDrawerVisible(true)
    requestAnimationFrame(() => setDrawerOpen(true))
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setTimeout(() => {
      setDrawerVisible(false)
      setIsSaving(false)
    }, 300)
  }

  function handleOpenCallModal(lead, e) {
    if (e) e.stopPropagation()
    setIsSaving(false)
    setActiveLead(lead)
    setSelectedLeadId(lead.id)
    setFormData({
      assignedTo: lead.assignedTo || callerOptions[0] || '',
      callStatus: lead.callStatus || 'Pending Call',
      priority: lead.priority || null, // Keep null if not rated yet
      remarks: lead.remarks || '',
      nextFollowUpDate: lead.nextFollowUpDate || '',
      nextFollowUpTime: lead.nextFollowUpTime || '10:00 AM',
    })
    openDrawer()
  }

  async function handleSaveCall(e) {
    e.preventDefault()
    if (isSaving || !activeLead) return

    const isFollowUp =
      formData.callStatus === 'Follow Up' ||
      formData.callStatus === 'Interested' ||
      formData.callStatus === 'Quotation Requested' ||
      formData.callStatus === 'Considering' ||
      Boolean(formData.nextFollowUpDate)

    const isActuallyCalled = formData.callStatus !== 'Pending Call'

    setError('')
    setIsSaving(true)
    try {
      const d = new Date()
      const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      await api.patch(`/transactions/leads/${activeLead.id}/`, {
        assigned_to: formData.assignedTo,
        call_status: formData.callStatus,
        priority: (isActuallyCalled ? formData.priority : (activeLead.priority || formData.priority)) || '',
        remarks: formData.remarks || activeLead.remarks,
        next_follow_up_date: formData.nextFollowUpDate,
        next_follow_up_time: formData.nextFollowUpTime,
        has_follow_up: isFollowUp,
        last_call_date: isActuallyCalled ? todayISO : activeLead.lastCallDate,
      })
      await refreshData()
      closeDrawer()
    } catch (err) {
      setIsSaving(false)
      setError(err.message)
    }
  }

  // Filtered Telecall leads
  const filteredLeads = useMemo(() => {
    return telecallList.filter((item) => {
      // 1. Caller filter
      const matchesCaller =
        selectedCaller === 'All Callers' || item.assignedTo === selectedCaller

      // 2. Status filter
      const matchesStatus =
        selectedStatus === 'All Status' || item.callStatus === selectedStatus

      // 3. Priority filter
      let matchesPriority = true
      if (selectedPriority === 'Hot') {
        matchesPriority = item.priority === 'Hot'
      } else if (selectedPriority === 'Warm') {
        matchesPriority = item.priority === 'Warm'
      } else if (selectedPriority === 'Cold') {
        matchesPriority = item.priority === 'Cold'
      }

      // 4. Search query
      const matchesSearch =
        item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCaller && matchesStatus && matchesPriority && matchesSearch
    })
  }, [telecallList, selectedCaller, selectedStatus, selectedPriority, searchQuery])

  return (
    <Layout>
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Tele Call
              </h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                {totalAssignedCount} Assigned Leads
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribute unassigned raw leads to staff, track follow-up history, and log call outcomes.
            </p>
          </div>

          {/* Quick Metrics (Only for Qualified / Assessed Leads) */}
          <div className="flex items-center gap-1.5">
            <div className="rounded-lg border border-red-200/80 bg-red-50/60 px-2.5 py-1.5" title="Qualified Hot Leads">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Hot</span>
              <span className="text-xs font-bold text-red-700 ml-1">
                {hotLeadsCount}
              </span>
            </div>
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5" title="Qualified Warm Leads">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Warm</span>
              <span className="text-xs font-bold text-amber-700 ml-1">
                {warmLeadsCount}
              </span>
            </div>
            <div className="rounded-lg border border-blue-200/80 bg-blue-50/60 px-2.5 py-1.5" title="Qualified Cold Leads">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Cold</span>
              <span className="text-xs font-bold text-blue-700 ml-1">
                {coldLeadsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Main Table Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4">
          {/* Instruction Tip */}
          <div className="border-b border-slate-100 pb-3.5 mb-3.5">
            <p className="text-xs text-slate-500">
              💡 <em>Click on any lead row to view its complete Follow Up History below.</em>
            </p>
          </div>

          {/* Table Toolbar (Caller Filter + Status Filter + Priority Pills + Search Box) */}
          <div className="flex flex-col gap-3.5 border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Controls: Caller Filter + Status Filter + Priority Filter Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Assigned Caller Dropdown (only for manager/admin who see all callers) */}
                {canViewAll && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <UserFilterIcon />
                      <span>Caller:</span>
                    </span>
                    <select
                      value={selectedCaller}
                      onChange={(e) => setSelectedCaller(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    >
                      <option value="All Callers">All Callers</option>
                      {callerOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Dropdown (Right Next to Caller) */}
                <div className={`flex items-center gap-1.5 ${canViewAll ? 'pl-2 sm:border-l sm:border-slate-200' : ''}`}>
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <CheckCircleIcon />
                    <span>Status:</span>
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter Pills */}
                <div className="flex items-center gap-1 text-xs pl-2 sm:border-l sm:border-slate-200">
                  {['All', 'Hot', 'Warm', 'Cold'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPriority(p)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        selectedPriority === p
                          ? p === 'Hot'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-800 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p === 'Hot' && (
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-[1px]" />
                      )}
                      {p === 'Warm' && (
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-[1px]" />
                      )}
                      {p === 'Cold' && (
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-[1px]" />
                      )}
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Search Box */}
              <div className="flex items-center w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search company, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-l-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Search"
                  className="flex h-[34px] w-9 items-center justify-center rounded-r-lg bg-brand-600 text-white transition hover:bg-brand-700 cursor-pointer"
                >
                  <SearchIcon />
                </button>
              </div>
            </div>
          </div>

          {/* Telecall Table */}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pr-2 font-semibold min-w-[180px]">Company</th>
                  <th className="pb-2.5 pr-2 font-semibold min-w-[110px]">Mobile</th>
                  <th className="pb-2.5 pr-2 font-semibold min-w-[100px]">Category</th>
                  {canViewAll && (
                    <th className="pb-2.5 pr-2 font-semibold min-w-[120px]">Assigned To</th>
                  )}
                  <th className="pb-2.5 pr-2 font-semibold min-w-[120px]">Call Status</th>
                  <th className="pb-2.5 pr-2 font-semibold min-w-[80px]">Priority</th>
                  <th className="pb-2.5 pr-2 font-semibold text-left min-w-[110px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLeadId === lead.id
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-brand-50/80 font-medium'
                            : 'text-slate-600 hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Company */}
                        <td className="py-0.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />
                            )}
                            <p className="font-semibold text-slate-900 text-xs truncate max-w-[200px]" title={lead.company}>
                              {lead.company}
                            </p>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-0.5 pr-3">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs text-slate-800 hover:text-brand-600 font-medium inline-flex items-center gap-1"
                            title="Click to Call"
                          >
                            <PhoneCallIcon className="h-3 w-3 text-slate-400" />
                            <span>{lead.phone}</span>
                          </a>
                        </td>

                        {/* Category */}
                        <td className="py-0.5 pr-3 font-medium text-slate-800 text-xs">
                          {lead.category}
                        </td>

                        {/* Assigned Caller */}
                        {canViewAll && (
                          <td className="py-0.5 pr-3">
                            {lead.assignedTo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>{lead.assignedTo}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>Not Assigned</span>
                              </span>
                            )}
                          </td>
                        )}

                        {/* Call Status Badge */}
                        <td className="py-0.5 pr-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                lead.callStatus === 'Interested'
                                  ? 'bg-emerald-500'
                                  : lead.callStatus === 'Quotation Requested'
                                  ? 'bg-purple-500'
                                  : lead.callStatus === 'Considering'
                                  ? 'bg-cyan-500'
                                  : lead.callStatus === 'Follow Up'
                                  ? 'bg-amber-500'
                                  : lead.callStatus === 'Not Reachable'
                                  ? 'bg-slate-400'
                                  : lead.callStatus === 'Pending Call'
                                  ? 'bg-blue-500'
                                  : lead.callStatus === 'Busy'
                                  ? 'bg-orange-400'
                                  : lead.callStatus === 'For Future'
                                  ? 'bg-teal-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span
                              className={`${
                                lead.callStatus === 'Interested'
                                  ? 'text-emerald-700'
                                  : lead.callStatus === 'Quotation Requested'
                                  ? 'text-purple-700'
                                  : lead.callStatus === 'Considering'
                                  ? 'text-cyan-700'
                                  : lead.callStatus === 'Follow Up'
                                  ? 'text-amber-700'
                                  : lead.callStatus === 'Not Reachable'
                                  ? 'text-slate-600'
                                  : lead.callStatus === 'Pending Call'
                                  ? 'text-blue-700'
                                  : lead.callStatus === 'Busy'
                                  ? 'text-orange-700'
                                  : lead.callStatus === 'For Future'
                                  ? 'text-teal-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {lead.callStatus}
                            </span>
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-0.5 pr-3">
                          {lead.priority ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  lead.priority === 'Hot'
                                    ? 'bg-red-500'
                                    : lead.priority === 'Warm'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                                }`}
                              />
                              <span
                                className={`${
                                  lead.priority === 'Hot'
                                    ? 'text-red-600'
                                    : lead.priority === 'Warm'
                                    ? 'text-amber-600'
                                    : 'text-blue-600'
                                }`}
                              >
                                {lead.priority}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px] italic">
                              - Not Set -
                            </span>
                          )}
                        </td>

                        {/* Action Button: Log Call / Assign */}
                        <td className="py-0.5 pr-3 text-left">
                          <button
                            type="button"
                            onClick={(e) => handleOpenCallModal(lead, e)}
                            className="flex items-center gap-1 rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-600 hover:text-white transition cursor-pointer shadow-2xs"
                          >
                            <PhoneCallIcon className="h-3 w-3" />
                            <span>{lead.assignedTo ? 'Update' : 'Assign / Call'}</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={canViewAll ? 7 : 6} className="py-8 text-center text-xs text-slate-400">
                      {isLoading
                        ? 'Loading tele-call leads...'
                        : error
                        ? error
                        : 'No leads assigned.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Static Pagination Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-medium">
              Showing 1 to {filteredLeads.length} of {filteredLeads.length} entries
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded-md bg-brand-50 text-brand-600 font-bold border border-brand-200/60"
              >
                1
              </button>
              <button
                type="button"
                className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Follow Up History Card (Appears Below Table for Selected Lead) */}
        {selectedLeadForHistory && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            {/* History Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <HistoryIcon className="h-4 w-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Follow Up History & Call Log
                </h3>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-brand-700 break-all">
                  {selectedLeadForHistory.company}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({selectedLeadForHistory.contact} - {selectedLeadForHistory.phone})
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCallModal(selectedLeadForHistory)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-600 hover:text-white transition cursor-pointer border border-brand-200/60 self-start sm:self-auto"
              >
                <PhoneCallIcon className="h-3.5 w-3.5" />
                <span>+ Log New Follow-Up</span>
              </button>
            </div>

            {/* Latest Remarks for the selected lead */}
            {selectedLeadForHistory.remarks && selectedLeadForHistory.remarks !== '-' && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-xs">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <p className="text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">Latest remarks: </span>
                  {selectedLeadForHistory.remarks}
                </p>
              </div>
            )}

            {/* History Records Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 pr-2 font-semibold w-40">Date & Time</th>
                    <th className="pb-2.5 pr-2 font-semibold w-36">Staff / Caller</th>
                    <th className="pb-2.5 pr-2 font-semibold w-80">Report / Remarks</th>
                    <th className="pb-2.5 pr-2 font-semibold w-48">Scheduled Follow Up</th>
                    <th className="pb-2.5 pr-2 font-semibold text-left w-36">Outcome Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedLeadForHistory.history && selectedLeadForHistory.history.length > 0 ? (
                    selectedLeadForHistory.history.map((h) => (
                      <tr key={h.id} className="text-slate-600 hover:bg-slate-50/50">
                        {/* Date & Time */}
                        <td className="py-0.5 pr-3 font-mono text-[11px] text-slate-700">
                          {h.dateTime}
                        </td>

                        {/* Caller */}
                        <td className="py-0.5 pr-3 font-medium text-slate-900">
                          {h.caller}
                        </td>

                        {/* Report */}
                        <td className="py-0.5 pr-3 text-slate-700">
                          {h.report}
                        </td>

                        {/* Follow Up */}
                        <td className="py-0.5 pr-3">
                          <span className="font-semibold text-blue-700 text-xs flex items-center gap-1">
                            <CalendarDaysIcon className="h-3 w-3 text-blue-500" />
                            <span>{h.followUp}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-0.5 pr-3 text-left">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              h.status === 'Interested'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : h.status === 'Quotation Requested'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200/70'
                                : h.status === 'Follow Up'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                        No previous call follow-up history logged for this lead yet. Click <strong>&ldquo;Log New Follow-Up&rdquo;</strong> to record the first contact.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


      {/* Slide-Over Drawer: Update Call Outcome, Remarks & Priority */}
      {drawerVisible && activeLead && (
        <div className="fixed inset-0 z-50">
          <div
            className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
              drawerOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeDrawer}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-md sm:max-w-lg">
            <div
              className={`flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                drawerOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Drawer Header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <PhoneCallIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900">Log Tele Call</h2>
                  <p className="text-[11px] text-slate-500">
                    Record outcome, set priority & schedule follow-up
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Close drawer"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                  <span className="sm:hidden">Close</span>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {/* Customer Summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {activeLead.company.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold leading-snug text-slate-900">
                        {activeLead.company}
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {activeLead.contact} • {activeLead.category}
                        {activeLead.city ? ` • ${activeLead.city}` : ''}
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold text-slate-800">
                        {activeLead.phone}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          {activeLead.callStatus}
                        </span>
                        {activeLead.priority && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {activeLead.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`tel:${activeLead.phone}`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <PhoneCallIcon className="h-3.5 w-3.5" />
                    Call Now
                  </a>
                </div>

                {/* Drawer Form */}
                <form id="telecall-form" onSubmit={handleSaveCall} className="mt-5 space-y-4 text-xs">
                  {/* Call Details */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Call Details
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {canAssign && (
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            Assigned Caller
                          </label>
                          <select
                            value={formData.assignedTo}
                            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          >
                            {callerOptions.length === 0 ? (
                              <option value="">No callers assigned</option>
                            ) : (
                              callerOptions.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Call Outcome
                        </label>
                        <select
                          value={formData.callStatus}
                          onChange={(e) => setFormData({ ...formData, callStatus: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="Pending Call">Pending Call (Not Called Yet)</option>
                          <option value="Interested">Interested</option>
                          <option value="Considering">Considering</option>
                          <option value="Quotation Requested">Quotation Requested</option>
                          <option value="Follow Up">Follow Up / Call Back</option>
                          <option value="Not Reachable">Not Reachable</option>
                          <option value="Busy">Busy / Meeting</option>
                          <option value="Not Interested">Not Interested</option>
                          <option value="For Future">For Future</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Priority Rating */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Lead Priority
                      </h4>
                      {formData.priority && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, priority: null })}
                          className="text-[11px] font-medium text-slate-400 transition hover:text-slate-600"
                        >
                          Clear rating
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Hot', dot: 'bg-red-500' },
                        { label: 'Warm', dot: 'bg-amber-500' },
                        { label: 'Cold', dot: 'bg-blue-500' },
                      ].map((p) => {
                        const isActive = formData.priority === p.label
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, priority: isActive ? null : p.label })
                            }
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                              isActive
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                            {p.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Follow-Up */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Next Follow-Up
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 1)
                          setFormData((prev) => ({
                            ...prev,
                            nextFollowUpDate: d.toISOString().split('T')[0],
                          }))
                        }}
                        className="text-[11px] font-medium text-brand-600 hover:underline"
                      >
                        + Tomorrow
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="date"
                        value={formData.nextFollowUpDate}
                        onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <select
                        value={formData.nextFollowUpTime}
                        onChange={(e) => setFormData({ ...formData, nextFollowUpTime: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="09:30 AM">09:30 AM (Morning)</option>
                        <option value="10:30 AM">10:30 AM (Morning)</option>
                        <option value="11:30 AM">11:30 AM (Mid-Day)</option>
                        <option value="02:00 PM">02:00 PM (Afternoon)</option>
                        <option value="03:30 PM">03:30 PM (Evening)</option>
                        <option value="05:00 PM">05:00 PM (End of Day)</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Call Remarks / Notes
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter customer requirements, budget, discussion summary..."
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </form>
              </div>

              {/* Drawer Footer */}
              <div className="flex shrink-0 items-center gap-2.5 border-t border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={isSaving}
                  className="flex-1 rounded-lg border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="telecall-form"
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                  Save Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
