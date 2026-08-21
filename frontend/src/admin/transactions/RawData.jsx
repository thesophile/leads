import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import Layout from '../../Layout/Layout'
import { can } from '../../utils/permissions'
import ConfirmDialog from '../../components/ConfirmDialog'
import useDirty from '../../utils/useDirty'

const STAFF_LIST = [
  'All Employees',
  'Shanu VR',
  'Alex Joseph',
  'Priya Sharma',
  'Ananya Nair',
  'Rahul Varma',
]

const SOURCE_LIST = [
  'All Sources',
  'Google Search',
  'Official Website',
  'Instagram Campaign',
  'Facebook Ads',
  'Customer Referral',
  'Manual Entry',
]

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function UploadCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      <polyline points="16 16 12 12 8 16" />
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

function UsersIcon({ className = 'h-4 w-4 text-white' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function GlobeIcon({ className = 'h-3.5 w-3.5 text-slate-500' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
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

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-red-400 hover:text-red-600 transition" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-red-400 hover:text-red-600 transition" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function BuildingIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
      <path d="M16 8h3a1 1 0 0 1 1 1v12" />
      <path d="M7 7h2M7 11h2M7 15h2M11 7h2M11 11h2M11 15h2M3 21h19" />
    </svg>
  )
}

function UserIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function PhoneIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function MailIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function TagIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

export default function RawData() {
  const { user } = useAuth()
  const [rawDataList, setRawDataList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('All Employees')
  const [selectedSource, setSelectedSource] = useState('All Sources')
  const [dateFilterType, setDateFilterType] = useState('All Time')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importedFileName, setImportedFileName] = useState('')
  const [importSuccessMessage, setImportSuccessMessage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteModalId, setDeleteModalId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [duplicateRecord, setDuplicateRecord] = useState(null)

  const canAssignLeads = !!user && (can(user, 'leads.assign') || user.is_superuser)

  const [assignableStaff, setAssignableStaff] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignStaffList, setAssignStaffList] = useState([])
  const [assignStaffOpen, setAssignStaffOpen] = useState(false)
  const [assignCategory, setAssignCategory] = useState('All Categories')
  const [assignFromDate, setAssignFromDate] = useState('')
  const [assignToDate, setAssignToDate] = useState('')
  const [assignCount, setAssignCount] = useState(50)
  const [assignSuccessMessage, setAssignSuccessMessage] = useState('')
  const [discardAssignOpen, setDiscardAssignOpen] = useState(false)
  const [discardImportOpen, setDiscardImportOpen] = useState(false)
  const [discardDrawerOpen, setDiscardDrawerOpen] = useState(false)

  const { dirty: assignDirty, reset: resetAssignDirty } = useDirty(
    assignModalOpen,
    useMemo(
      () => ({
        assignStaffList,
        assignCategory,
        assignFromDate,
        assignToDate,
        assignCount,
      }),
      [assignStaffList, assignCategory, assignFromDate, assignToDate, assignCount]
    )
  )

  const { dirty: importDirty, reset: resetImportDirty } = useDirty(
    importModalOpen,
    useMemo(() => ({ importedFileName }), [importedFileName])
  )

  function requestCloseAssign() {
    if (assignDirty) setDiscardAssignOpen(true)
    else setAssignModalOpen(false)
  }

  function requestCloseImport() {
    if (importDirty) setDiscardImportOpen(true)
    else setImportModalOpen(false)
  }

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const data = await api.get('/transactions/leads/?status=raw')
        if (!cancelled) setRawDataList(data)
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

  useEffect(() => {
    let cancelled = false

    async function fetchStaff() {
      try {
        const data = await api.get('/auth/assignable-staff/')
        if (!cancelled) {
          setAssignableStaff(data)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    if (canAssignLeads) fetchStaff()
    return () => {
      cancelled = true
    }
  }, [canAssignLeads])

  useEffect(() => {
    let cancelled = false

    async function fetchCategories() {
      try {
        const data = await api.get('/master/categories/')
        if (!cancelled) setCategoryOptions(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    fetchCategories()
    return () => {
      cancelled = true
    }
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function refreshData() {
    setIsLoading(true)
    setError('')
    try {
      const data = await api.get('/transactions/leads/?status=raw')
      setRawDataList(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Drawer Form State - pure contact intake
  const [formData, setFormData] = useState({
    company: '',
    contact: '',
    phone: '',
    email: '',
    category: '',
    source: '',
    city: '',
  })

  function openDrawer() {
    setIsSaving(false)
    setDuplicateRecord(null)
    setDrawerVisible(true)
    requestAnimationFrame(() => setDrawerOpen(true))
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setTimeout(() => setDrawerVisible(false), 300)
  }

  const { dirty: drawerDirty, reset: resetDrawerDirty } = useDirty(drawerVisible, formData)

  function requestCloseDrawer() {
    if (drawerDirty) setDiscardDrawerOpen(true)
    else closeDrawer()
  }

  function handleOpenAdd() {
    setEditingId(null)
    setFormData({
      company: '',
      contact: '',
      phone: '',
      email: '',
      category: '',
      source: '',
      city: '',
    })
    openDrawer()
  }

  function handleEditClick(item) {
    setEditingId(item.id)
    setFormData({
      company: item.company || '',
      contact: item.contact || '',
      phone: item.phone || '',
      email: item.email || '',
      category: item.category || '',
      source: item.source || '',
      city: item.city || '',
    })
    openDrawer()
  }

  async function handleSave(e) {
    e.preventDefault()
    if (isSaving) return
    setError('')
    if (!formData.company.trim()) return

    setIsSaving(true)
    try {
      if (editingId) {
        await api.patch(`/transactions/leads/${editingId}/`, formData)
        showToast('Raw data updated.')
      } else {
        await api.post('/transactions/leads/', formData)
        showToast('Raw data added.')
      }
      setEditingId(null)
      resetDrawerDirty()
      closeDrawer()
      await refreshData()
    } catch (err) {
      if (err.status === 409 && err.data?.existing) {
        setDuplicateRecord(err.data.existing)
      } else {
        setError(err.message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBulkImport(e) {
    e.preventDefault()
    if (isImporting) return
    setError('')
    if (!importedFileName) return

    // Bulk import adds realistic raw leads through the API
    const importedSample = [
      {
        company: 'ROYAL DENTAL HEALTHCARE',
        contact: 'Dr. John Mathew',
        phone: '9847002233',
        email: 'john@royaldental.in',
        category: 'Hospital',
        source: 'Google Search',
        city: 'Kochi',
      },
      {
        company: 'AURORA BOUTIQUE & APPARELS',
        contact: 'Sunitha Nair',
        phone: '9744119988',
        email: 'aurora.sales@gmail.com',
        category: 'Fancy Shops',
        source: 'Instagram Campaign',
        city: 'Calicut',
      },
    ]

    setIsImporting(true)
    try {
      await Promise.all(
        importedSample.map((record) => api.post('/transactions/leads/', record))
      )
      setImportSuccessMessage(`Successfully imported 2 leads from ${importedFileName}!`)
      await refreshData()
    } catch (err) {
      if (err.status === 409 && err.data?.existing) {
        setDuplicateRecord(err.data.existing)
      } else {
        setError(err.message)
      }
    } finally {
      setIsImporting(false)
      resetImportDirty()
      setTimeout(() => {
        setImportModalOpen(false)
        setImportedFileName('')
        setImportSuccessMessage('')
      }, 1200)
    }
  }

  async function confirmDelete(id) {
    setDeleteModalId(null)
    setError('')
    try {
      await api.del(`/transactions/leads/${id}/`)
      showToast('Raw data deleted.')
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleAssignStaff(name) {
    setAssignStaffList((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  function toggleAllAssignStaff() {
    const allNames = assignableStaff.map((s) => s.name)
    const allSelected = assignStaffList.length === allNames.length && allNames.length > 0
    setAssignStaffList(allSelected ? [] : allNames)
  }

  function formatAssignStaffSummary(names) {
    const joined = names.join(', ')
    const maxLen = 42
    if (joined.length <= maxLen) return joined
    let cut = joined.slice(0, maxLen)
    const lastComma = cut.lastIndexOf(', ')
    if (lastComma > 0) cut = cut.slice(0, lastComma)
    return `${cut}…`
  }

  async function handleExecuteAssign(e) {
    e.preventDefault()
    if (isSaving) return
    setError('')
    if (assignStaffList.length === 0) {
      setError('Please select at least one staff member.')
      return
    }

    setIsSaving(true)
    try {
      const res = await api.post('/transactions/leads/assign/', {
        assigned_to: assignStaffList,
        category: assignCategory,
        from_date: assignFromDate,
        to_date: assignToDate,
        count: assignCountToUse,
      })
      setAssignSuccessMessage(`✓ Successfully allocated ${res.assigned} lead(s) to ${formatAssignStaffSummary(assignStaffList)}!`)
      resetAssignDirty()
      await refreshData()
      setTimeout(() => {
        setAssignSuccessMessage('')
        setAssignStaffList([])
        setAssignModalOpen(false)
      }, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Raw Data only lists unassigned (status=raw) leads.
  const totalUnassignedCount = useMemo(() => {
    return rawDataList.filter((l) => {
      if (assignCategory !== 'All Categories' && l.category !== assignCategory) return false
      if (assignFromDate && !(l.date && l.date >= assignFromDate)) return false
      if (assignToDate && !(l.date && l.date <= assignToDate)) return false
      return true
    }).length
  }, [rawDataList, assignCategory, assignFromDate, assignToDate])
  const assignCountToUse = Math.min(assignCount, totalUnassignedCount)

  // Filtered Leads based on search, staff, source, and date range
  const filteredData = useMemo(() => {
    return rawDataList.filter((l) => {
      // 1. Staff Filter
      const matchesStaff =
        selectedStaff === 'All Employees' || l.addedBy === selectedStaff

      // 2. Source Filter
      const matchesSource =
        selectedSource === 'All Sources' || l.source === selectedSource

      // 3. Search query filter
      const matchesSearch =
        l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone.includes(searchQuery) ||
        l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.source && l.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
        l.city.toLowerCase().includes(searchQuery.toLowerCase())

      // 4. Date Filter
      let matchesDate = true
      if (dateFilterType === 'Today') {
        matchesDate = l.date === '2026-08-12'
      } else if (dateFilterType === 'Yesterday') {
        matchesDate = l.date === '2026-08-11'
      } else if (dateFilterType === 'Last 7 Days') {
        matchesDate = l.date >= '2026-08-05'
      } else if (dateFilterType === 'This Month') {
        matchesDate = l.date.startsWith('2026-08')
      } else if (dateFilterType === 'Custom') {
        if (startDate && l.date < startDate) matchesDate = false
        if (endDate && l.date > endDate) matchesDate = false
      }

      return matchesStaff && matchesSource && matchesSearch && matchesDate
    })
  }, [rawDataList, selectedStaff, selectedSource, searchQuery, dateFilterType, startDate, endDate])

  const hasActiveFilters =
    selectedStaff !== 'All Employees' ||
    selectedSource !== 'All Sources' ||
    dateFilterType !== 'All Time' ||
    searchQuery.trim() !== ''

  function clearAllFilters() {
    setSelectedStaff('All Employees')
    setSelectedSource('All Sources')
    setDateFilterType('All Time')
    setStartDate('')
    setEndDate('')
    setSearchQuery('')
  }

  return (
    <Layout>
      <div className="space-y-4">
        {toast && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </span>
            <span className="text-xs font-semibold text-slate-800">{toast}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {/* Top Header Card */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Raw Data
              </h1>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-600 border border-brand-200/60">
                {rawDataList.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Intake and capture raw customer contacts before telecalling qualification.
            </p>
          </div>

          {/* Action Buttons: Import Excel/CSV + Add Raw Data */}
          <div className="flex items-center gap-2.5">
            {/* Import Excel / CSV Button */}
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            >
              <UploadCloudIcon />
              <span>Import Excel / CSV</span>
            </button>

            {/* Action Button to Open Drawer Form */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-600/20 transition-all hover:bg-brand-700 active:scale-[0.98] cursor-pointer"
            >
              <PlusIcon />
              <span>Add Raw Data</span>
            </button>

            {/* Assign Leads to Staff Button (Managers and above only) */}
            {canAssignLeads && (
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98] cursor-pointer"
              >
                <UsersIcon className="h-4 w-4" />
                <span>Assign Leads to Staff</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Leads Table Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Table Toolbar (Filter by Employee + Source + Date Range + Search Box) */}
          <div className="flex flex-col gap-3.5 border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Controls: Filter by Employee, Source, and Date */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Employee Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <UserFilterIcon />
                    <span>Employee:</span>
                  </span>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {STAFF_LIST.map((staff) => (
                      <option key={staff} value={staff}>
                        {staff}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Filter Dropdown */}
                <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <GlobeIcon />
                    <span>Source:</span>
                  </span>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {SOURCE_LIST.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter Dropdown */}
                <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <CalendarIcon />
                    <span>Date:</span>
                  </span>
                  <select
                    value={dateFilterType}
                    onChange={(e) => setDateFilterType(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="All Time">All Time</option>
                    <option value="Today">Today (12 Aug)</option>
                    <option value="Yesterday">Yesterday (11 Aug)</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="This Month">This Month (August)</option>
                    <option value="Custom">Custom Range...</option>
                  </select>
                </div>

                {/* Reset Filters Link */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-brand-600 font-semibold hover:text-brand-700 hover:underline pl-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Right Search Box */}
              <div className="flex items-center">
                <div className="relative flex-1 sm:w-60">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search raw data..."
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

            {/* Custom Date Range Row (Appears when Custom Range is chosen) */}
            {dateFilterType === 'Custom' && (
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs bg-slate-50/50 p-2.5 rounded-xl">
                <span className="font-semibold text-slate-600">From Date:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                />
                <span className="font-semibold text-slate-600">To Date:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                />
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-2 cursor-pointer"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-black text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-2 font-semibold w-64">Company Name</th>
                  <th className="pb-2 font-semibold w-44">Contact Person</th>
                  <th className="pb-2 font-semibold w-32">Mobile</th>
                  <th className="pb-2 font-semibold w-48">Email</th>
                  <th className="pb-2 font-semibold w-36">Category</th>
                  <th className="pb-2 font-semibold w-32">Location</th>
                  <th className="pb-2 font-semibold w-28">Date</th>
                  <th className="pb-2 font-semibold text-left w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                      Loading raw data...
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr key={item.id} onClick={() => handleEditClick(item)} className="text-slate-600 hover:bg-slate-50/50 transition-colors cursor-pointer">
                      {/* Company Name */}
                      <td className="py-2 pr-2 font-semibold text-slate-900 text-xs truncate max-w-[200px]" title={item.company}>
                        {item.company}
                      </td>

                      {/* Contact Person */}
                      <td className="py-2 pr-2 font-medium text-slate-700 text-xs">
                        {item.contact}
                      </td>

                      {/* Phone */}
                      <td className="py-2 pr-2 font-mono text-xs text-slate-700">
                        {item.phone}
                      </td>

                      {/* Email */}
                      <td className="py-2 pr-2 text-slate-500 text-xs truncate max-w-[180px]">
                        {item.email}
                      </td>

                      {/* Category */}
                      <td className="py-2 pr-2 font-medium text-slate-800 text-xs">
                        {item.category}
                      </td>

                      {/* Location */}
                      <td className="py-2 pr-2 text-slate-600 text-xs">
                        {item.city}
                      </td>

                      {/* Date */}
                      <td className="py-2 pr-2 text-slate-400 text-[11px]">
                        {item.displayDate}
                      </td>

                      {/* Actions */}
                      <td className="py-2 pr-2 text-left">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditClick(item)
                            }}
                            title="Edit Raw Data"
                            className="rounded-lg p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteModalId(item.id)
                            }}
                            title="Delete Raw Data"
                            className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                      No raw data records found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Static Pagination Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-medium">
              Showing 1 to {filteredData.length} of {filteredData.length} entries
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
      </div>

      {/* Assign Leads to Staff Modal (Managers and above only) */}
      {assignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !assignDirty) setAssignModalOpen(false)
          }}
        >
          <div className="flex max-h-full w-full flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 sm:max-w-xl">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                  <UsersIcon className="h-5 w-5 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Leads to Staff
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribute raw leads across sales and telecalling teams.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestCloseAssign}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleExecuteAssign} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Step 1: Select Staff Member */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Select Staff Member
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {assignStaffList.length === 0
                      ? 'None selected'
                      : `${assignStaffList.length} selected`}
                  </span>
                </div>

                <div className="relative mt-1">
                  {/* Multi-select trigger */}
                  <button
                    type="button"
                    onClick={() => setAssignStaffOpen((v) => !v)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-slate-50/50 px-3 py-2 text-left text-xs transition cursor-pointer ${
                      assignStaffOpen
                        ? 'border-brand-500 ring-2 ring-brand-500/10'
                        : 'border-slate-300'
                    }`}
                  >
                    <span className={`truncate font-semibold ${
                      assignStaffList.length === 0 ? 'text-slate-400' : 'text-slate-800'
                    }`}>
                      {assignStaffList.length === 0
                        ? 'Select staff members…'
                        : formatAssignStaffSummary(assignStaffList)}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${assignStaffOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Checkbox dropdown panel */}
                  {assignStaffOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setAssignStaffOpen(false)}
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
                                  assignStaffList.length === assignableStaff.length && assignableStaff.length > 0
                                }
                                onChange={toggleAllAssignStaff}
                                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
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
                                  checked={assignStaffList.includes(staff.name)}
                                  onChange={() => toggleAssignStaff(staff.name)}
                                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
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

              {/* Step 2: Filter Records & Set Volume */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Filter Lead Pool & Set Volume
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={assignCategory}
                      onChange={(e) => setAssignCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                    >
                      <option value="All Categories">All Categories</option>
                      {categoryOptions.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={assignFromDate}
                      onChange={(e) => setAssignFromDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={assignToDate}
                      onChange={(e) => setAssignToDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Leads to Assign:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 100, 200].map((preset) => {
                        const disabled = preset > totalUnassignedCount
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAssignCount(preset)}
                            disabled={disabled}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition border ${
                              disabled
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : assignCount === preset
                                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs cursor-pointer'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer'
                            }`}
                          >
                            {preset}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="w-28">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Custom Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={totalUnassignedCount || 100}
                      value={assignCountToUse}
                      onChange={(e) => setAssignCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Info Banner */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Ready to assign <strong className="text-slate-900">{assignCountToUse}</strong> leads out of{' '}
                  <strong className="text-brand-600">{totalUnassignedCount}</strong> unassigned records matching filters.
                </span>
              </div>

              {assignSuccessMessage && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-700 text-center animate-in fade-in">
                  {assignSuccessMessage}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={requestCloseAssign}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || assignStaffList.length === 0}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>✓ Assign {assignCount} Lead(s) to {assignStaffList.length > 0 ? `${assignStaffList.length} Staff` : 'Select Staff'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Excel/CSV Import Modal */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !importDirty) setImportModalOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <UploadCloudIcon />
                </div>
                <h3 className="text-base font-bold text-slate-900">Import Excel / CSV Leads</h3>
              </div>
              <button
                type="button"
                onClick={requestCloseImport}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="mt-4 space-y-4">
              {/* Drag and Drop Zone */}
              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:bg-slate-50 transition">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      setImportedFileName(e.target.files[0].name)
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloudIcon />
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {importedFileName ? (
                    <span className="text-brand-600 font-bold">{importedFileName}</span>
                  ) : (
                    'Click to upload or drag and drop Excel/CSV'
                  )}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports CSV, XLSX or XLS spreadsheets
                </p>
              </div>

              {importSuccessMessage && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-semibold text-emerald-700 text-center">
                  {importSuccessMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={requestCloseImport}
                  disabled={isImporting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !importedFileName}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {isImporting ? 'Importing…' : 'Upload & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Right Slide-Over Drawer Form for Add / Edit Raw Data */}
      {drawerVisible && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ${
              drawerOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={requestCloseDrawer}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className={`w-screen max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                drawerOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingId ? 'Edit Raw Data' : 'Add New Raw Data'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingId
                      ? `Updating details for ${editingId}`
                      : `Capture contact and company information · added by ${user?.name || 'you'}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestCloseDrawer}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Drawer Body (Form) */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-3.5">
                {/* Company Name */}
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                    <BuildingIcon className="h-3.5 w-3.5" />
                  </span>
                  <input
                    id="drawer_company"
                    type="text"
                    placeholder="Company Name"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                    className="peer relative z-0 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  />
                  <label
                    htmlFor="drawer_company"
                    className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                      formData.company
                        ? '-top-2 text-slate-500'
                        : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                    } peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-brand-600`}
                  >
                    Company / Organization Name *
                  </label>
                </div>

                {/* Contact Person */}
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                    <UserIcon className="h-3.5 w-3.5" />
                  </span>
                  <input
                    id="drawer_contact"
                    type="text"
                    placeholder="Contact Person"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="peer relative z-0 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  />
                  <label
                    htmlFor="drawer_contact"
                    className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                      formData.contact
                        ? '-top-2 text-slate-500'
                        : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                    } peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-brand-600`}
                  >
                    Contact Person
                  </label>
                </div>

                {/* Mobile & Email 2-col Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Phone */}
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                      <PhoneIcon className="h-3.5 w-3.5" />
                    </span>
                    <input
                      id="drawer_phone"
                      type="text"
                      placeholder="Mobile Phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="peer relative z-0 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                    />
                    <label
                      htmlFor="drawer_phone"
                      className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                        formData.phone
                          ? '-top-2 text-slate-500'
                          : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                      } peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-brand-600`}
                    >
                      Primary Mobile *
                    </label>
                  </div>

                  {/* Email */}
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                      <MailIcon className="h-3.5 w-3.5" />
                    </span>
                    <input
                      id="drawer_email"
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="peer relative z-0 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                    />
                    <label
                      htmlFor="drawer_email"
                      className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                        formData.email
                          ? '-top-2 text-slate-500'
                          : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                      } peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-brand-600`}
                    >
                      Email Address
                    </label>
                  </div>
                </div>

                {/* Category Selection */}
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                    <TagIcon className="h-3.5 w-3.5" />
                  </span>
                  <select
                    id="drawer_category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="peer relative z-0 w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
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
                  <label
                    htmlFor="drawer_category"
                    className="absolute left-8 -top-2 z-10 bg-white px-1 text-[10px] font-medium text-slate-500 cursor-pointer peer-focus:text-brand-600"
                  >
                    Category
                  </label>
                </div>

                {/* Source Selection in Drawer */}
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                    <GlobeIcon className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                  <select
                    id="drawer_source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="peer relative z-0 w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  >
                    <option value="" disabled hidden>
                      Select Source
                    </option>
                    <option value="Google Search">Google Search</option>
                    <option value="Official Website">Official Website</option>
                    <option value="Instagram Campaign">Instagram Campaign</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Customer Referral">Customer Referral</option>
                    <option value="Manual Entry">Manual Entry</option>
                  </select>
                  <label
                    htmlFor="drawer_source"
                    className="absolute left-8 -top-2 z-10 bg-white px-1 text-[10px] font-medium text-slate-500 cursor-pointer peer-focus:text-brand-600"
                  >
                    Lead Source
                  </label>
                </div>

                {/* City */}
                <div className="relative mt-2">
                  <input
                    id="drawer_city"
                    type="text"
                    placeholder="City / Region"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="peer relative z-0 w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder-transparent transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  />
                  <label
                    htmlFor="drawer_city"
                    className={`absolute left-3 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                      formData.city
                        ? '-top-2 text-slate-500'
                        : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                    } peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-brand-600`}
                  >
                    City / Location
                  </label>
                </div>
              </form>

              {/* Drawer Footer Buttons */}
              <div className="p-4 border-t border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
                <button
                  type="button"
                  onClick={requestCloseDrawer}
                  disabled={isSaving}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : editingId ? 'Update Raw Data' : 'Save Raw Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Found Modal */}
      {duplicateRecord && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDuplicateRecord(null)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Duplicate Lead Found</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This lead has already been entered. Please use the existing record.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Company</span>
                <span className="text-xs font-bold text-slate-800 text-right">{duplicateRecord.company}</span>
              </div>
              {duplicateRecord.contact && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contact</span>
                  <span className="text-xs font-medium text-slate-700 text-right">{duplicateRecord.contact}</span>
                </div>
              )}
              {duplicateRecord.phone && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Mobile</span>
                  <span className="text-xs font-mono font-medium text-slate-700 text-right">{duplicateRecord.phone}</span>
                </div>
              )}
              {duplicateRecord.category && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Category</span>
                  <span className="text-xs font-medium text-slate-700 text-right">{duplicateRecord.category}</span>
                </div>
              )}
              {duplicateRecord.city && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Location</span>
                  <span className="text-xs font-medium text-slate-700 text-right">{duplicateRecord.city}</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 border-t border-slate-200 pt-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Entered by</span>
                <span className="text-xs font-bold text-brand-600 text-right">{duplicateRecord.addedBy || '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</span>
                <span className="text-xs font-medium text-slate-700 text-right">{duplicateRecord.displayDate || '—'}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDuplicateRecord(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Got it
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuplicateRecord(null)
                  closeDrawer()
                }}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 transition cursor-pointer"
              >
                Close Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModalId(null)
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Raw Data</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to remove this raw contact record? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(deleteModalId)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Confirms */}
      <ConfirmDialog
        open={discardAssignOpen}
        onCancel={() => setDiscardAssignOpen(false)}
        onConfirm={() => {
          setDiscardAssignOpen(false)
          setAssignModalOpen(false)
          resetAssignDirty()
        }}
      />
      <ConfirmDialog
        open={discardImportOpen}
        onCancel={() => setDiscardImportOpen(false)}
        onConfirm={() => {
          setDiscardImportOpen(false)
          setImportModalOpen(false)
          resetImportDirty()
        }}
      />
      <ConfirmDialog
        open={discardDrawerOpen}
        onCancel={() => setDiscardDrawerOpen(false)}
        onConfirm={() => {
          setDiscardDrawerOpen(false)
          closeDrawer()
          resetDrawerDirty()
        }}
      />
    </Layout>
  )
}
