import { useState, useMemo, useEffect, useRef } from 'react'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import { can } from '../../utils/permissions'
import { localISO } from '../../utils/date'
import RefreshButton from '../../components/RefreshButton'
import PaginationBar from '../../components/PaginationBar'
import usePagedList, { useDebouncedValue, fetchAllPaged } from '../../utils/usePagedList'

const STATUSES = [
  'All Status',
  'Pending Call',
  'Interested',
  'Quotation Requested',
  'Follow Up',
  'Not Interested',
  'For Future',
  'Called',
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

function ChevronDownIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function LockIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UsersIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export default function Telecall() {
  const { user } = useAuth()
  const [error, setError] = useState('')

  const canViewAll = !!user && (can(user, 'leads.view_all') || user.is_superuser)
  const canAssign = !!user && (can(user, 'leads.assign') || user.is_superuser)
  const isLockAdmin = !!user && (can(user, 'leads.manage_lock') || user.is_superuser)
  const canLockLead = (lead) => !!lead && (isLockAdmin || lead.assignedTo === user?.name)

  const [categoryOptions, setCategoryOptions] = useState([])
  const [sourceOptions, setSourceOptions] = useState([])

  useEffect(() => {
    let cancelled = false

    async function fetchCategoryOptions() {
      try {
        const data = await api.get('/master/categories/')
        if (!cancelled) setCategoryOptions(data)
      } catch {
        // Fall back to empty options; the drawer still allows the current value.
      }
    }

    fetchCategoryOptions()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchSourceOptions() {
      try {
        const data = await api.get('/master/sources/')
        if (!cancelled) setSourceOptions(data)
      } catch {
        // Fall back to empty options.
      }
    }

    fetchSourceOptions()
    return () => {
      cancelled = true
    }
  }, [])

  function refreshData() {
    setError('')
    refetch()
  }

  const [selectedCaller, setSelectedCaller] = useState('All Callers')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const searchDebounced = useDebouncedValue(searchQuery)

  const listParams = useMemo(
    () => ({
      status: 'assigned',
      ...(canViewAll && selectedCaller !== 'All Callers' ? { assigned_to: selectedCaller } : {}),
      ...(selectedStatus !== 'All Status' ? { call_status: selectedStatus } : {}),
      ...(selectedPriority !== 'All' ? { priority: selectedPriority } : {}),
      ...(searchDebounced ? { search: searchDebounced } : {}),
    }),
    [canViewAll, selectedCaller, selectedStatus, selectedPriority, searchDebounced]
  )

  const {
    rows: telecallList,
    count,
    loading: isLoading,
    page,
    totalPages,
    setPage,
    refetch,
  } = usePagedList({
    url: '/transactions/leads/',
    params: listParams,
    onError: (msg) => setError(msg),
  })

  const [meta, setMeta] = useState({ facets: {}, counts: {} })
  useEffect(() => {
    let cancelled = false
    api
      .get('/transactions/leads/meta/', { params: { status: 'assigned' } })
      .then((data) => {
        if (!cancelled) setMeta(data || { facets: {}, counts: {} })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const callerOptions = useMemo(
    () => (Array.isArray(meta.facets?.assigned_to) ? meta.facets.assigned_to : []),
    [meta]
  )

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
    company: '',
    contact: '',
    phone: '',
    email: '',
    category: '',
    city: '',
    source: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [lockBusy, setLockBusy] = useState(false)
  const [notice, setNotice] = useState('')

  // Company Details section collapsed by default in the update drawer
  const [companyDetailsOpen, setCompanyDetailsOpen] = useState(false)

  // History Panel State (opens on row click)
  const [historyVisible, setHistoryVisible] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLead, setHistoryLead] = useState(null)

  function openHistoryPanel(lead) {
    setHistoryLead(lead)
    setHistoryVisible(true)
    requestAnimationFrame(() => setHistoryOpen(true))
  }

  function closeHistoryPanel() {
    setHistoryOpen(false)
    setTimeout(() => {
      setHistoryVisible(false)
      setHistoryLead(null)
    }, 300)
  }

  // Lead counts & KPIs come from the server-side meta feed so they stay exact
  // even when only one page of rows is loaded.
  const totalAssignedCount = meta.counts?.total ?? count
  const hotLeadsCount = meta.counts?.by_priority?.Hot || 0
  const warmLeadsCount = meta.counts?.by_priority?.Warm || 0
  const coldLeadsCount = meta.counts?.by_priority?.Cold || 0

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
    setError('')
    setNotice('')
    setActiveLead(lead)
    setFormData({
      assignedTo: lead.assignedTo || callerOptions[0] || '',
      callStatus: lead.callStatus || 'Pending Call',
      priority: lead.priority || null, // Keep null if not rated yet
      remarks: lead.remarks || '',
      nextFollowUpDate: lead.nextFollowUpDate || '',
      nextFollowUpTime: lead.nextFollowUpTime || '10:00 AM',
      company: lead.company || '',
      contact: lead.contact || '',
      phone: lead.phone || '',
      email: lead.email || '',
      category: lead.category || '',
      city: lead.city || '',
      source: lead.source || '',
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
        priority: formData.priority || '',
        remarks: formData.remarks || activeLead.remarks,
        next_follow_up_date: formData.nextFollowUpDate,
        next_follow_up_time: formData.nextFollowUpTime,
        has_follow_up: isFollowUp,
        last_call_date: isActuallyCalled ? todayISO : activeLead.lastCallDate,
        company: formData.company || activeLead.company,
        contact: formData.contact || '',
        phone: formData.phone || activeLead.phone,
        email: formData.email || '',
        category: formData.category || '',
        city: formData.city || '',
        source: formData.source || '',
      })
      await refreshData()
      closeDrawer()
    } catch (err) {
      setIsSaving(false)
      setError(err.message)
    }
  }

  async function handleToggleLock() {
    if (lockBusy || !activeLead) return
    setLockBusy(true)
    setError('')
    setNotice('')
    try {
      const action = activeLead.isLocked ? 'unlock' : 'lock'
      const updated = await api.post(`/transactions/leads/${activeLead.id}/${action}/`, {})
      const refreshed = { ...activeLead, isLocked: updated.isLocked, lockedBy: updated.lockedBy }
      setActiveLead(refreshed)
      await refreshData()
      setNotice(refreshed.isLocked ? 'Lead locked.' : 'Lead unlocked.')
      setTimeout(() => setNotice(''), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLockBusy(false)
    }
  }

  // The server already applies caller / status / priority / search filters;
  // the page rows are rendered as-is.
  const filteredLeads = telecallList

  // Reassignable staff dropdown options (mirrors Raw Data's assign modal).
  const [assignableStaff, setAssignableStaff] = useState([])
  useEffect(() => {
    let cancelled = false
    async function fetchStaff() {
      try {
        const data = await api.get('/auth/assignable-staff/')
        if (!cancelled) setAssignableStaff(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    if (canAssign) fetchStaff()
    return () => {
      cancelled = true
    }
  }, [canAssign])

  // Bulk reassign selection state
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignStaffList, setReassignStaffList] = useState([])
  const [reassignStaffOpen, setReassignStaffOpen] = useState(false)
  const [reassignIsSaving, setReassignIsSaving] = useState(false)
  const [reassignSuccessMessage, setReassignSuccessMessage] = useState('')

  // Locked leads are selectable only by admins (leads.manage_lock), who may
  // reassign worked/closed leads; managers can only select unlocked leads.
  const isSelectable = (lead) => !!lead && (!lead.isLocked || isLockAdmin)

  function toggleSelectLead(lead) {
    if (lead.isLocked && !isLockAdmin) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(lead.id)) next.delete(lead.id)
      else next.add(lead.id)
      return next
    })
  }

  // Header "select all on this page" checkbox state.
  const pageIds = filteredLeads.filter(isSelectable).map((lead) => lead.id)
  const pageSelectedCount = pageIds.filter((id) => selectedIds.has(id)).length
  const allPageSelected = pageIds.length > 0 && pageSelectedCount === pageIds.length
  const somePageSelected = pageSelectedCount > 0 && !allPageSelected
  const headerCheckboxRef = useRef(null)

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = somePageSelected
    }
  }, [somePageSelected])

  function toggleSelectPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of pageIds) {
        if (allPageSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  // Select every reassignable lead matching the current filters, across all
  // pages — same behaviour as Raw Data's "select all records". Locked leads are
  // included for admins only.
  async function selectAllRecords() {
    setError('')
    try {
      const all = await fetchAllPaged('/transactions/leads/', listParams, 500)
      const ids = all.filter(isSelectable).map((lead) => lead.id).filter(Boolean)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.add(id)
        return next
      })
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleReassignStaff(name) {
    setReassignStaffList((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  function toggleAllReassignStaff() {
    const allNames = assignableStaff.map((s) => s.name)
    const allSelected = reassignStaffList.length === allNames.length && allNames.length > 0
    setReassignStaffList(allSelected ? [] : allNames)
  }

  function formatReassignStaffSummary(names) {
    const joined = names.join(', ')
    const maxLen = 42
    if (joined.length <= maxLen) return joined
    let cut = joined.slice(0, maxLen)
    const lastComma = cut.lastIndexOf(', ')
    if (lastComma > 0) cut = cut.slice(0, lastComma)
    return `${cut}…`
  }

  function closeReassignModal() {
    setReassignOpen(false)
    setReassignStaffOpen(false)
    setReassignStaffList([])
    setReassignSuccessMessage('')
  }

  async function handleExecuteReassign(e) {
    e.preventDefault()
    if (reassignIsSaving) return
    setError('')
    if (reassignStaffList.length === 0) {
      setError('Please select at least one staff member.')
      return
    }
    if (selectedIds.size === 0) {
      setError('Please select at least one tele-call lead to reassign.')
      return
    }

    setReassignIsSaving(true)
    try {
      const res = await api.post('/transactions/leads/reassign/', {
        assigned_to: reassignStaffList,
        lead_ids: [...selectedIds],
      })
      const lockedNote =
        (res.skipped_locked ?? 0) > 0
          ? ` ${res.skipped_locked} locked lead(s) skipped — only the assigned staff or an admin can move them.`
          : ''
      setReassignSuccessMessage(
        `✓ Successfully reassigned ${res.reassigned} lead(s) to ${formatReassignStaffSummary(reassignStaffList)}!${lockedNote}`
      )
      await refreshData()
      setSelectedIds(new Set())
      setTimeout(() => {
        closeReassignModal()
        setReassignIsSaving(false)
      }, 1200)
    } catch (err) {
      setError(err.message)
      setReassignIsSaving(false)
    }
  }

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
            <RefreshButton onClick={refreshData} loading={isLoading} compact className="mr-1" />
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
              💡 <em>Click on any lead row to view its Follow Up History &amp; Call Log.</em>
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

          {/* Selection Bar (appears when any lead is selected for reassign) */}
          {canAssign && selectedIds.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-brand-800">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-black text-white">
                    ☑
                  </span>
                  {selectedIds.size} selected
                </span>
                {selectedIds.size < count && (
                  <button
                    type="button"
                    onClick={selectAllRecords}
                    className="flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-brand-700 transition hover:text-brand-800 hover:underline cursor-pointer"
                  >
                    Select all {count} leads?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="flex items-center gap-1 rounded-md border border-brand-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                >
                  <CloseIcon className="h-3 w-3" />
                  Clear
                </button>
              </div>
              <button
                type="button"
                onClick={() => setReassignOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] cursor-pointer"
              >
                <UsersIcon className="h-3.5 w-3.5 text-white" />
                <span>Reassign</span>
              </button>
            </div>
          )}

          {/* Telecall Table */}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  {canAssign && (
                    <th className="pb-2.5 pr-2 font-semibold w-8">
                      <label
                        title="Select all on this page"
                        className="flex cursor-pointer items-center justify-center px-1 -mx-1 -my-2 py-2"
                      >
                        <input
                          type="checkbox"
                          ref={headerCheckboxRef}
                          checked={allPageSelected}
                          onChange={toggleSelectPage}
                          aria-label="Select all reassignable leads on this page"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </label>
                    </th>
                  )}
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
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => openHistoryPanel(lead)}
                        className={`transition-colors cursor-pointer text-slate-600 hover:bg-slate-50/60`}
                      >
                        {/* Select Checkbox (locked leads require an admin) */}
                        {canAssign && (
                          <td className="py-0.5 pr-2">
                            {lead.isLocked && !isLockAdmin ? (
                              <span
                                className="flex items-center justify-center cursor-not-allowed text-amber-400"
                                title="This lead is locked and cannot be reassigned"
                              >
                                <LockIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <label
                                onClick={(e) => e.stopPropagation()}
                                className="flex cursor-pointer items-center justify-center px-1 -mx-1 py-2 -my-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(lead.id)}
                                  onChange={() => toggleSelectLead(lead)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Select ${lead.company}`}
                                  title={lead.isLocked ? 'Locked lead — admin can reassign' : undefined}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                />
                              </label>
                            )}
                          </td>
                        )}
                        {/* Company */}
                        <td className="py-0.5 pr-3">
                          <div className="flex items-center gap-1.5">
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
                                  : lead.callStatus === 'Follow Up'
                                  ? 'bg-amber-500'
                                  : lead.callStatus === 'Called'
                                  ? 'bg-cyan-500'
                                  : lead.callStatus === 'Pending Call'
                                  ? 'bg-blue-500'
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
                                  : lead.callStatus === 'Follow Up'
                                  ? 'text-amber-700'
                                  : lead.callStatus === 'Called'
                                  ? 'text-cyan-700'
                                  : lead.callStatus === 'Pending Call'
                                  ? 'text-blue-700'
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
                    <td colSpan={(canViewAll ? 7 : 6) + (canAssign ? 1 : 0)} className="py-8 text-center text-xs text-slate-400">
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

          <PaginationBar
            page={page}
            totalPages={totalPages}
            count={count}
            pageSize={25}
            onChange={setPage}
          />
        </div>
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
                {/* In-drawer error banner: surface save/validation failures instead of failing silently */}
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                    {error}
                  </div>
                )}
                {/* Customer Summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {activeLead.company.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold leading-snug text-slate-900">
                        {formData.company || activeLead.company}
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {formData.contact || activeLead.contact} • {formData.category || activeLead.category}
                        {(formData.city || activeLead.city) ? ` • ${formData.city || activeLead.city}` : ''}
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold text-slate-800">
                        {formData.phone || activeLead.phone}
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
                        {activeLead.isLocked && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            <LockIcon className="h-3 w-3" />
                            Locked{activeLead.lockedBy ? ` by ${activeLead.lockedBy}` : ''}
                          </span>
                        )}
                        {canLockLead(activeLead) && (
                          <button
                            type="button"
                            onClick={handleToggleLock}
                            disabled={lockBusy}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              activeLead.isLocked
                                ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-700'
                            }`}
                          >
                            <LockIcon className="h-2.5 w-2.5" />
                            {activeLead.isLocked ? 'Unlock' : 'Lock'}
                          </button>
                        )}
                      </div>
                      {activeLead.isLocked && !canLockLead(activeLead) && (
                        <p className="mt-1 text-[10px] font-medium text-amber-600">
                          This lead is locked — only an admin can reassign it.
                        </p>
                      )}
                      {notice && (
                        <p className="mt-1 text-[10px] font-semibold text-emerald-600">{notice}</p>
                      )}
                    </div>
                  </div>
                  <a
                    href={`tel:${formData.phone || activeLead.phone}`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <PhoneCallIcon className="h-3.5 w-3.5" />
                    Call Now
                  </a>
                </div>

                {/* Drawer Form */}
                <form id="telecall-form" onSubmit={handleSaveCall} className="mt-5 space-y-4 text-xs">
                  {/* Company Details (editable at every stage, collapsed by default) */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setCompanyDetailsOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-left transition hover:bg-slate-100 cursor-pointer"
                      aria-expanded={companyDetailsOpen}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Company Details
                      </span>
                      <span className="flex items-center gap-1.5">
                        {!companyDetailsOpen && (
                          <span className="text-[10px] font-medium text-slate-400">
                            Changes sync to the lead &amp; quotation
                          </span>
                        )}
                        <ChevronDownIcon
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                            companyDetailsOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </button>
                    {companyDetailsOpen && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Contact Person
                        </label>
                        <input
                          type="text"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Category
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="" disabled hidden>
                            Select Category
                          </option>
                          {categoryOptions.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          City / Location
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">
                          Lead Source
                        </label>
                        <select
                          value={formData.source}
                          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="" disabled hidden>
                            Select Source
                          </option>
                          {sourceOptions.map((src) => (
                            <option key={src.id} value={src.name}>
                              {src.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    )}
                  </div>

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
                            disabled={activeLead.isLocked && !isLockAdmin}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
                          <option value="Quotation Requested">Quotation Requested</option>
                          <option value="Follow Up">Follow Up / Call Back</option>
                          <option value="Not Interested">Not Interested</option>
                          <option value="For Future">For Future</option>
                          <option value="Called">Called</option>
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
                            nextFollowUpDate: localISO(d),
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

                  {/* Contact change history (audit trail of company detail edits) */}
                  {activeLead.contactHistory && activeLead.contactHistory.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Contact change history
                      </p>
                      <ul className="space-y-1.5">
                        {activeLead.contactHistory.map((h) => (
                          <li
                            key={h.id}
                            className="flex flex-wrap items-start gap-x-2 gap-y-0.5 text-[11px] text-slate-600"
                          >
                            <span className="font-bold text-slate-700">{h.field}:</span>
                            <span className="text-slate-400 line-through">{h.fromValue || '(empty)'}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-semibold text-slate-800">{h.toValue || '(empty)'}</span>
                            <span className="ml-auto text-[10px] text-slate-400">
                              {h.changedBy || 'Unknown'}
                              {h.changedAt
                                ? ` · ${new Date(h.changedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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

      {/* Slide-Over Panel: Follow Up History & Call Log (Opens on Row Click) */}
      {historyVisible && historyLead && (
        <div className="fixed inset-0 z-50">
          <div
            className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
              historyOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeHistoryPanel}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-xl">
            <div
              className={`flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                historyOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Panel Header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <HistoryIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900">
                    Follow Up History &amp; Call Log
                  </h2>
                  <p className="truncate text-[11px] text-slate-500">
                    {historyLead.company} ({historyLead.contact} - {historyLead.phone})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeHistoryPanel}
                  aria-label="Close history panel"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                  <span className="sm:hidden">Close</span>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {/* Log New Follow-Up */}
                <button
                  type="button"
                  onClick={() => {
                    closeHistoryPanel()
                    handleOpenCallModal(historyLead)
                  }}
                  className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-600 hover:text-white transition cursor-pointer border border-brand-200/60"
                >
                  <PhoneCallIcon className="h-3.5 w-3.5" />
                  <span>+ Log New Follow-Up</span>
                </button>

                {/* Latest Remarks */}
                {historyLead.remarks && historyLead.remarks !== '-' && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-xs">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </span>
                    <p className="text-xs leading-relaxed text-slate-600">
                      <span className="font-semibold text-slate-800">Latest remarks: </span>
                      {historyLead.remarks}
                    </p>
                  </div>
                )}

                {/* History Records Table */}
                <div className="overflow-x-auto">
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
                      {historyLead.history && historyLead.history.length > 0 ? (
                        historyLead.history.map((h) => (
                          <tr key={h.id} className="text-slate-600 hover:bg-slate-50/50">
                            <td className="py-0.5 pr-3 font-mono text-[11px] text-slate-700">
                              {h.dateTime}
                            </td>
                            <td className="py-0.5 pr-3 font-medium text-slate-900">
                              {h.caller}
                            </td>
                            <td className="py-0.5 pr-3 text-slate-700">
                              {h.report}
                            </td>
                            <td className="py-0.5 pr-3">
                              <span className="font-semibold text-blue-700 text-xs flex items-center gap-1">
                                <CalendarDaysIcon className="h-3 w-3 text-blue-500" />
                                <span>{h.followUp}</span>
                              </span>
                            </td>
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
            </div>
          </div>
        </div>
      )}

      {/* Reassign Selected Leads Modal */}
      {reassignOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReassignModal()
          }}
        >
          <div className="flex max-h-full w-full flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 sm:max-w-xl">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <UsersIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900">
                    Reassign Tele-Call Leads
                  </h3>
                  <p className="text-xs text-slate-500">
                    Move the selected leads to one or more staff members.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReassignModal}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleExecuteReassign} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Step 1: Select Staff Member */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Select Staff Member
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {reassignStaffList.length === 0
                      ? 'None selected'
                      : `${reassignStaffList.length} selected`}
                  </span>
                </div>

                <div className="relative mt-1">
                  {/* Multi-select trigger */}
                  <button
                    type="button"
                    onClick={() => setReassignStaffOpen((v) => !v)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-slate-50/50 px-3 py-2 text-left text-xs transition cursor-pointer ${
                      reassignStaffOpen
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                        : 'border-slate-300'
                    }`}
                  >
                    <span className={`truncate font-semibold ${
                      reassignStaffList.length === 0 ? 'text-slate-400' : 'text-slate-800'
                    }`}>
                      {reassignStaffList.length === 0
                        ? 'Select staff members…'
                        : formatReassignStaffSummary(reassignStaffList)}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${reassignStaffOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Checkbox dropdown panel */}
                  {reassignStaffOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setReassignStaffOpen(false)}
                      />
                      <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        {assignableStaff.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-slate-400">No assignable staff</p>
                        ) : (
                          [
                            <label
                              key="__all__"
                              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  reassignStaffList.length === assignableStaff.length && assignableStaff.length > 0
                                }
                                onChange={toggleAllReassignStaff}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="font-semibold text-slate-800">All staff</span>
                            </label>,
                            ...assignableStaff.map((staff) => (
                              <label
                                key={staff.name}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={reassignStaffList.includes(staff.name)}
                                  onChange={() => toggleReassignStaff(staff.name)}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="font-semibold text-slate-800">{staff.name}</span>
                                {staff.role && <span className="text-[11px] text-slate-400">({staff.role})</span>}
                              </label>
                            )),
                          ]
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Live Info Banner */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Reassigning <strong className="text-emerald-700">{selectedIds.size}</strong> selected lead(s).
                </span>
              </div>

              {reassignSuccessMessage && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-700 text-center animate-in fade-in">
                  {reassignSuccessMessage}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeReassignModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignIsSaving || reassignStaffList.length === 0 || selectedIds.size === 0}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>✓ Reassign {selectedIds.size} Lead(s) to {reassignStaffList.length > 0 ? `${reassignStaffList.length} Staff` : 'Select Staff'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
