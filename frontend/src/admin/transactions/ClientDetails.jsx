import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../../Layout/Layout'
import ConfirmDialog from '../../components/ConfirmDialog'
import Spinner from '../../components/Spinner'
import RefreshButton from '../../components/RefreshButton'
import PaginationBar from '../../components/PaginationBar'
import useDirty from '../../utils/useDirty'
import { localISO } from '../../utils/date'
import usePagedList, { useDebouncedValue } from '../../utils/usePagedList'
import { api } from '../../api/client'

const ATTACHMENT_TYPES = ['SRS Document', 'Business Card', 'Voice Clip', 'Other']

const STAFF_LIST = [
  'All Staff',
  'Bincy',
  'Priya Sharma',
  'Ananya Nair',
  'Alex Joseph',
  'Shanu VR',
  'NIMISHA DAVIS',
  'Husna',
]

const CATEGORIES = [
  'All Category',
  'Dynamic Website',
  'Static Website',
  'Mobile App',
  'Dynamic Web & OPD Suite',
  'Meta Ads',
  'Google Ads',
  'SEO & Digital Marketing',
]

const STATUS_VALUES = [
  'Details Pending',
  'Details Complete',
  'In Progress',
  'Completed',
  'Paid',
]

const STATUS_LIST = ['All Status', ...STATUS_VALUES]

const TAB_RAIL = [
  { id: 'active', label: 'Active', statuses: ['Details Pending', 'Details Complete', 'In Progress'] },
  { id: 'completed', label: 'Completed', statuses: ['Completed', 'Paid'] },
  { id: 'all', label: 'All', statuses: null },
]

const STATUS_STYLES = {
  'Details Pending': 'border-slate-200 bg-slate-50 text-slate-700',
  'Details Complete': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  Completed: 'border-violet-200 bg-violet-50 text-violet-700',
  Paid: 'border-teal-200 bg-teal-50 text-teal-700',
}

const STATUS_CHIP_STYLES = {
  'Details Pending': 'border-amber-200 bg-amber-50/40 text-amber-700',
  'Details Complete': 'border-emerald-200 bg-emerald-50/40 text-emerald-700',
  'In Progress': 'border-blue-200 bg-blue-50/40 text-blue-700',
  Completed: 'border-violet-200 bg-violet-50/40 text-violet-700',
  Paid: 'border-teal-200 bg-teal-50/40 text-teal-700',
}

const EMPTY_FORM = {
  orderNo: '',
  clientName: '',
  company: '',
  mobile: '',
  email: '',
  category: 'Dynamic Website',
  acceptedDate: '',
  collectedBy: '',
  notes: '',
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function EyeIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PencilIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function ShareIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function CopyIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

function UploadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function TypeIcon({ type, className = 'h-3.5 w-3.5' }) {
  const common = {
    viewBox: '0 0 24 24',
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  if (type === 'Voice Clip') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    )
  }
  if (type === 'Business Card') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

const TYPE_STYLES = {
  'SRS Document': 'bg-blue-50 text-blue-700 border-blue-200',
  'Business Card': 'bg-violet-50 text-violet-700 border-violet-200',
  'Voice Clip': 'bg-rose-50 text-rose-700 border-rose-200',
  Other: 'bg-slate-100 text-slate-700 border-slate-200',
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ClientDetails() {
  const location = useLocation()
  const prefilledOrder = location.state?.order

  const [records, setRecords] = useState([])
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('All Staff')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [activeTab, setActiveTab] = useState('active')

  const [modalOpen, setModalOpen] = useState(() => Boolean(prefilledOrder))
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() =>
    prefilledOrder
      ? {
          orderNo: prefilledOrder.id || '',
          clientName: prefilledOrder.customer || '',
          company: prefilledOrder.company || '',
          mobile: prefilledOrder.mobile || '',
          email: prefilledOrder.email || '',
          category: prefilledOrder.category || 'Dynamic Website',
          acceptedDate: localISO(),
          collectedBy: prefilledOrder.proposalBy || prefilledOrder.staff || '',
          notes: '',
        }
      : EMPTY_FORM
  )
  const [newAttachments, setNewAttachments] = useState([])
  const [selectedFileType, setSelectedFileType] = useState('SRS Document')
  const [toastMessage, setToastMessage] = useState('')

  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [viewRecord, setViewRecord] = useState(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingAttachment, setDeletingAttachment] = useState(null)
  const [statusSavingId, setStatusSavingId] = useState(null)

  const cardRef = useRef(null)
  const menuRef = useRef(null)
  const [shareMenu, setShareMenu] = useState(null)
  const [menuOffset, setMenuOffset] = useState(null)
  const [shareLink, setShareLink] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const { dirty, reset } = useDirty(
    modalOpen,
    useMemo(
      () => ({
        ...form,
        attachmentCount: newAttachments.length,
      }),
      [form, newAttachments]
    )
  )

  function requestClose() {
    if (dirty) setDiscardOpen(true)
    else setModalOpen(false)
  }

  // Clear router state after prefill so a refresh doesn't reopen the form
  useEffect(() => {
    if (location.state?.order) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const searchDebounced = useDebouncedValue(searchQuery)

  const listParams = useMemo(
    () => ({
      tab: activeTab,
      ...(selectedStaff !== 'All Staff' ? { collected_by: selectedStaff } : {}),
      ...(selectedStatus !== 'All Status' ? { status: selectedStatus } : {}),
      ...(searchDebounced ? { search: searchDebounced } : {}),
    }),
    [activeTab, selectedStaff, selectedStatus, searchDebounced]
  )

  const {
    count,
    counts: listCounts,
    loading,
    page,
    totalPages,
    setPage,
    refetch,
  } = usePagedList({
    url: '/transactions/client-details/',
    params: listParams,
    onData: (pageRows) => {
      setLoadError('')
      setRecords(pageRows)
    },
    onError: (msg) => setLoadError(msg || 'Could not load client details.'),
  })

  const filteredRecords = records

  const totalCount = listCounts.total ?? count
  const statusCounts = STATUS_VALUES.map((status) => ({
    status,
    count: listCounts.by_status?.[status] || 0,
  }))

  function openAddModal() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setNewAttachments([])
    setModalOpen(true)
  }

  function openEditModal(rec) {
    setEditingId(rec.id)
    setForm({
      orderNo: rec.orderNo,
      clientName: rec.clientName,
      company: rec.company,
      mobile: rec.mobile,
      email: rec.email,
      category: rec.category,
      acceptedDate: rec.acceptedDate,
      collectedBy: rec.collectedBy,
      notes: rec.notes,
    })
    setNewAttachments([])
    setModalOpen(true)
  }

  function openViewModal(rec) {
    setViewRecord(rec)
  }

  function handleField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    const added = files.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      type: selectedFileType,
      name: file.name,
      mime: file.type || 'application/octet-stream',
      size: formatSize(file.size),
      url: URL.createObjectURL(file),
    }))
    setNewAttachments((prev) => [...prev, ...added])
    e.target.value = ''
  }

  function removeNewAttachment(id) {
    setNewAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  async function uploadAttachment(recordId, file, type) {
    const fd = new FormData()
    fd.append('file', file)
    if (type) fd.append('type', type)
    return api.post(
      `/transactions/client-details/${encodeURIComponent(recordId)}/attachments/`,
      fd
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    if (saving) return

    const payload = { ...form }
    if (!editingId) {
      // Status is only assigned when a record is first created; editing a
      // later-stage record must never regress its lifecycle status.
      payload.status = newAttachments.length > 0 ? 'Details Complete' : 'Details Pending'
      // Keep the order/lead link when saving a fresh (pre-filled) record.
      payload.leadId = form.leadId || prefilledOrder?.leadId || ''
    }

    setSaving(true)
    try {
      let record
      if (editingId) {
        record = await api.put(
          `/transactions/client-details/${encodeURIComponent(editingId)}/`,
          payload
        )
      } else {
        record = await api.post('/transactions/client-details/', payload)
      }
      // Upload any newly selected files now that the record has an id.
      for (const att of newAttachments) {
        await uploadAttachment(record.id, att.file, att.type)
      }
      refetch()
      setToastMessage(editingId ? '✓ Client details updated!' : '✓ Client details collected!')
    } catch (err) {
      setToastMessage(`✗ ${err.message || 'Could not save client details.'}`)
      setTimeout(() => setToastMessage(''), 3000)
      setSaving(false)
      return
    }

    setSaving(false)
    setModalOpen(false)
    setNewAttachments([])
    reset()
    setTimeout(() => setToastMessage(''), 2500)
  }

  async function handleStatusChange(id, newStatus) {
    if (statusSavingId) return
    setStatusSavingId(id)
    const previous = records.find((r) => r.id === id)?.status
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)))
    try {
      await api.put(`/transactions/client-details/${encodeURIComponent(id)}/`, { status: newStatus })
    } catch (err) {
      // Roll back the optimistic update so the UI matches the server.
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: previous } : r))
      )
      setToastMessage(`✗ ${err.message || 'Could not update status.'}`)
      setTimeout(() => setToastMessage(''), 3000)
    } finally {
      setStatusSavingId(null)
    }
  }

  async function removeExistingAttachment(att) {
    if (deletingAttachment) return
    const record = records.find((r) => r.id === editingId)
    if (!record) return
    setDeletingAttachment(att.id)
    try {
      await api.del(
        `/transactions/client-details/${encodeURIComponent(record.id)}/attachments/${att.id}/`
      )
      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? { ...r, attachments: r.attachments.filter((a) => a.id !== att.id) }
            : r
        )
      )
      setToastMessage('✓ Attachment removed.')
    } catch (err) {
      setToastMessage(`✗ ${err.message || 'Could not remove attachment.'}`)
    }
    setDeletingAttachment(null)
    setTimeout(() => setToastMessage(''), 2500)
  }

  function isImage(att) {
    return (att.mime || '').startsWith('image/')
  }
  function isAudio(att) {
    return (att.mime || '').startsWith('audio/')
  }
  function isPdf(att) {
    return (att.mime || '').toLowerCase() === 'application/pdf' || /\.pdf$/i.test(att.name || '')
  }
  function openAttachment(att) {
    if (att.url) window.open(att.url, '_blank', 'noopener,noreferrer')
  }

  async function handleShareClick(e, rec) {
    e.stopPropagation()
    if (shareLoading) return
    const cardRect = cardRef.current ? cardRef.current.getBoundingClientRect() : { left: 0, top: 0 }
    const btnRect = e.currentTarget.getBoundingClientRect()
    setShareMenu({ id: rec.id, name: rec.clientName || rec.company })
    setMenuOffset({ x: btnRect.left - cardRect.left + btnRect.width, y: btnRect.top - cardRect.top })
    setShareLink('')
    setShareCopied(false)
    setShareLoading(true)
    try {
      const data = await api.post(
        `/transactions/client-details/${encodeURIComponent(rec.id)}/send-to-client/`,
        { channels: ['copy'], origin: window.location.origin }
      )
      setShareLink(data.link)
    } catch (err) {
      setToastMessage(`✗ ${err.message || 'Could not generate share link.'}`)
      setTimeout(() => setToastMessage(''), 3000)
      setShareMenu(null)
    } finally {
      setShareLoading(false)
    }
  }

  useLayoutEffect(() => {
    if (!shareMenu || !menuOffset || !menuRef.current) return
    const w = menuRef.current.offsetWidth
    const h = menuRef.current.offsetHeight
    const pad = 8
    let left = menuOffset.x
    let top = menuOffset.y
    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect()
      if (cardRect.left + left + w > window.innerWidth - pad) {
        left = window.innerWidth - pad - cardRect.left - w
      }
      if (cardRect.top + top + h > window.innerHeight - pad) {
        top = menuOffset.y - h - 12
      }
    }
    menuRef.current.style.left = `${left}px`
    menuRef.current.style.top = `${top + 12}px`
  }, [shareMenu, menuOffset, shareLoading])

  function closeShareMenu() {
    setShareMenu(null)
    setMenuOffset(null)
  }

  async function handleCopyShareLink() {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setShareCopied(true)
      setToastMessage('✓ Upload link copied to clipboard.')
      setTimeout(() => setToastMessage(''), 2500)
    } catch {
      setToastMessage(`Could not copy automatically. Link: ${shareLink}`)
      setTimeout(() => setToastMessage(''), 4000)
    }
  }

  const editableRecord = editingId ? records.find((r) => r.id === editingId) : null

  return (
    <Layout>
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Client Details Collection
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Collect SRS, business cards, voice clips and notes from clients who accepted their orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton onClick={() => { setLoadError(''); refetch() }} loading={loading} />
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition cursor-pointer active:scale-95"
            >
              <PlusIcon />
              <span>New Client Details</span>
            </button>
          </div>
        </div>

        {/* KPI Chips */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">{totalCount}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Clients</span>
            </div>
          </div>
          {statusCounts.map(({ status, count }) => (
            <div key={status} className={`rounded-xl border p-3.5 shadow-xs ${STATUS_CHIP_STYLES[status] || 'border-slate-200 bg-white text-slate-700'}`}>
              <span className="text-[10px] font-semibold uppercase tracking-wider">{status}</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-bold">{count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Horizontal Tab Rail */}
        <div className="flex flex-wrap items-center gap-2">
          {TAB_RAIL.map((tab) => {
            const count = tab.statuses
              ? records.filter((r) => tab.statuses.includes(r.status)).length
              : records.length
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setSelectedStatus('All Status')
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'border-brand-600 bg-brand-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Table Card */}
        <div ref={cardRef} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3.5 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Staff:</span>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none cursor-pointer"
                >
                  {STAFF_LIST.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none cursor-pointer"
                >
                  {STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search client, company, order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pr-2 font-semibold">Order No</th>
                  <th className="pb-2.5 pr-2 font-semibold">Client / Company</th>
                  <th className="pb-2.5 pr-2 font-semibold">Mobile</th>
                  <th className="pb-2.5 pr-2 font-semibold">Category</th>
                  <th className="pb-2.5 pr-2 font-semibold">Collected By</th>
                  <th className="pb-2.5 pr-2 font-semibold">Attachments</th>
                  <th className="pb-2.5 pr-2 font-semibold">Status</th>
                  <th className="pb-2.5 pr-2 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                      Loading client details...
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-rose-500">
                      {loadError}
                    </td>
                  </tr>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} onClick={() => openViewModal(rec)} className="text-slate-600 hover:bg-slate-50/60 transition-colors cursor-pointer">
                      <td className="py-0.5 pr-3 font-mono font-bold text-slate-950">{rec.orderNo}</td>
                      <td className="py-0.5 pr-3 min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[160px]" title={rec.clientName}>{rec.clientName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={rec.company}>{rec.company}</div>
                      </td>
                      <td className="py-0.5 pr-3 font-mono text-[11px] text-slate-600">{rec.mobile}</td>
                      <td className="py-0.5 pr-3">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {rec.category}
                        </span>
                      </td>
                      <td className="py-0.5 pr-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                          {rec.collectedBy}
                        </span>
                      </td>
                      <td className="py-0.5 pr-3">
                        {rec.attachments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {rec.attachments.map((att) => (
                              <button
                                key={att.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewAttachment(att)
                                }}
                                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer ${TYPE_STYLES[att.type] || TYPE_STYLES.Other}`}
                                title={`Preview ${att.name}`}
                              >
                                <TypeIcon type={att.type} className="h-3 w-3" />
                                {att.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">No attachments</span>
                        )}
                      </td>
                      <td className="py-0.5 pr-3">
                        <select
                          value={rec.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(rec.id, e.target.value)}
                          title="Change status"
                          disabled={statusSavingId === rec.id}
                          aria-label={`Status for ${rec.clientName}`}
                          className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60 disabled:cursor-not-allowed ${STATUS_STYLES[rec.status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}
                        >
                          {STATUS_VALUES.map((statusValue) => (
                            <option key={statusValue} value={statusValue}>
                              {statusValue}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-0.5 pr-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleShareClick(e, rec)}
                            disabled={shareLoading}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer disabled:opacity-50"
                            title="Share upload link"
                          >
                            <ShareIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(rec)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                            title="Edit"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                      No client detail records found matching criteria.
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
            pageSize={50}
            onChange={setPage}
          />

          {/* Share Link Popover (anchored to the card so it scrolls with the page) */}
          {shareMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation()
                  closeShareMenu()
                }}
              />
              <div
                ref={menuRef}
                style={{ position: 'absolute', zIndex: 40 }}
                className="w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-slate-950/5 animate-in fade-in zoom-in-95 duration-100 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <ShareIcon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Share upload link</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={shareMenu.name}>
                        {shareMenu.name}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeShareMenu}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                    aria-label="Close"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2.5 text-[10px] leading-relaxed text-slate-500">
                  Share this link with {shareMenu.name} to let them upload their documents
                  (SRS, business cards, voice clips) themselves.
                </p>
                <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
                  {shareLoading ? (
                    <span className="text-[11px] text-slate-400">Generating link…</span>
                  ) : (
                    <span className="block break-all font-mono text-[11px] leading-relaxed text-slate-700">
                      {shareLink || 'Loading…'}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    disabled={!shareLink || shareLoading}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CopyIcon className="h-3.5 w-3.5" />
                    {shareCopied ? 'Copied!' : 'Copy link'}
                  </button>
                  <a
                    href={shareLink ? `https://wa.me/?text=${encodeURIComponent(`Please upload your documents using this link:\n${shareLink}`)}` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer ${shareLink ? '' : 'pointer-events-none opacity-50'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !dirty) setModalOpen(false)
          }}
        >
          <div className="w-full max-w-2xl my-8 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-white">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Client Details' : 'Collect Client Details'}
              </h3>
              <button
                type="button"
                onClick={requestClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSave} className="max-h-[75vh] overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Order No</label>
                  <input
                    type="text"
                    required
                    value={form.orderNo}
                    onChange={(e) => handleField('orderNo', e.target.value)}
                    placeholder="ORD-2026-001"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Accepted Date</label>
                  <input
                    type="date"
                    required
                    value={form.acceptedDate}
                    onChange={(e) => handleField('acceptedDate', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    required
                    value={form.clientName}
                    onChange={(e) => handleField('clientName', e.target.value)}
                    placeholder="Contact person"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={form.company}
                    onChange={(e) => handleField('company', e.target.value)}
                    placeholder="Company"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={form.mobile}
                    onChange={(e) => handleField('mobile', e.target.value)}
                    placeholder="9447151442"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="text"
                    value={form.email}
                    onChange={(e) => handleField('email', e.target.value)}
                    placeholder="client@company.com"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => handleField('category', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Category').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Collected By</label>
                  <select
                    value={form.collectedBy}
                    onChange={(e) => handleField('collectedBy', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    {STAFF_LIST.filter((s) => s !== 'All Staff').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attachments */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-800 text-xs">Client Documents & Handover Material</h4>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Attach SRS, business card image, voice clip or any other handover file (PDF, image or audio,
                  up to 10 MB each).
                </p>

                {editableRecord && editableRecord.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {editableRecord.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
                      >
                        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_STYLES[att.type] || TYPE_STYLES.Other}`}>
                          <TypeIcon type={att.type} className="h-3 w-3" />
                          {att.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => openAttachment(att)}
                          className="max-w-[180px] truncate hover:text-blue-600 cursor-pointer"
                          title="Open document"
                        >
                          {att.name}
                        </button>
                        <span className="text-[10px] text-slate-400">{att.size}</span>
                        <button
                          type="button"
                          onClick={() => removeExistingAttachment(att)}
                          disabled={deletingAttachment === att.id}
                          className="rounded p-0.5 text-slate-400 hover:text-red-600 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Remove document"
                        >
                          {deletingAttachment === att.id ? (
                            <Spinner className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <TrashIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={selectedFileType}
                    onChange={(e) => setSelectedFileType(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    {ATTACHMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition cursor-pointer">
                    <UploadIcon className="h-3.5 w-3.5" />
                    Upload File
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>

                {newAttachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
                      >
                        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_STYLES[att.type] || TYPE_STYLES.Other}`}>
                          <TypeIcon type={att.type} className="h-3 w-3" />
                          {att.type}
                        </span>
                        <span className="max-w-[180px] truncate">{att.name}</span>
                        <span className="text-[10px] text-slate-400">{att.size}</span>
                        <button
                          type="button"
                          onClick={() => removeNewAttachment(att.id)}
                          className="rounded p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove"
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => handleField('notes', e.target.value)}
                  placeholder="Any remarks about client handover material..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 transition cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving && <Spinner className="h-3.5 w-3.5" />}
                  {saving
                    ? 'Saving…'
                    : editingId
                      ? 'Save Changes'
                      : 'Save Client Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Client Details Modal (read-only) */}
      {viewRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewRecord(null)
          }}
        >
          <div className="w-full max-w-2xl my-8 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-white">
              <div>
                <p className="font-mono text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                  {viewRecord.orderNo || 'Client Details'}
                </p>
                <h3 className="text-sm font-bold text-slate-900">{viewRecord.clientName}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[viewRecord.status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}
                >
                  {viewRecord.status}
                </span>
                <button
                  type="button"
                  onClick={() => setViewRecord(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order No</p>
                  <p className="mt-0.5 text-xs font-mono font-semibold text-slate-800">{viewRecord.orderNo || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client Name</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-800">{viewRecord.clientName || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-800">{viewRecord.company || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile</p>
                  <p className="mt-0.5 text-xs font-mono text-slate-800">{viewRecord.mobile || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRecord.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRecord.category || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accepted Date</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRecord.acceptedDate || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collected By</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRecord.collectedBy || '—'}</p>
                </div>
              </div>

              {viewRecord.notes && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
                  <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 leading-relaxed">
                    {viewRecord.notes}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Documents ({viewRecord.attachments.length})
                </p>
                {viewRecord.attachments.length > 0 ? (
                  <div className="mt-2 space-y-3">
                    {viewRecord.attachments.map((att) => (
                      <div key={att.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_STYLES[att.type] || TYPE_STYLES.Other}`}>
                              <TypeIcon type={att.type} className="h-3 w-3" />
                              {att.type}
                            </span>
                            <span className="truncate text-xs font-semibold text-slate-800" title={att.name}>
                              {att.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {att.url && (
                              <>
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Open
                                </a>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="rounded-md bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700 hover:bg-brand-100 transition cursor-pointer"
                                >
                                  Download
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        <div
                          className="mt-2.5 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewAttachment(att)
                          }}
                          title="Preview"
                        >
                          {isImage(att) ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="max-h-44 w-full rounded-lg border border-slate-200 bg-white object-contain"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreviewAttachment(att)
                              }}
                            />
                          ) : isAudio(att) ? (
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                              <audio controls src={att.url} className="w-full" />
                            </div>
                          ) : isPdf(att) ? (
                            <iframe
                              src={att.url}
                              title={att.name}
                              className="h-48 w-full rounded-lg border border-slate-200 bg-white"
                            />
                          ) : (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-[11px] text-slate-400">
                              Preview not supported — open or download the file.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-[11px] text-slate-400">
                    No documents uploaded yet.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
              <button
                type="button"
                onClick={() => {
                  const rec = viewRecord
                  setViewRecord(null)
                  openEditModal(rec)
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition cursor-pointer"
              >
                Edit Details
              </button>
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Attachment Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewAttachment(null)
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${TYPE_STYLES[previewAttachment.type] || TYPE_STYLES.Other}`}>
                  <TypeIcon type={previewAttachment.type} className="h-3.5 w-3.5" />
                  {previewAttachment.type}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-[240px]">{previewAttachment.name}</h3>
                  <p className="text-[11px] text-slate-400">{previewAttachment.size}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-4 flex min-h-[220px] items-center justify-center">
              {previewAttachment.url ? (
                isImage(previewAttachment) ? (
                  <img src={previewAttachment.url} alt={previewAttachment.name} className="max-h-72 rounded-lg border border-slate-200 object-contain" />
                ) : isAudio(previewAttachment) ? (
                  <audio controls src={previewAttachment.url} className="w-full" />
                ) : isPdf(previewAttachment) ? (
                  <iframe
                    src={previewAttachment.url}
                    title={previewAttachment.name}
                    className="h-[420px] w-full rounded-lg border border-slate-200 bg-slate-100"
                  />
                ) : (
                  <a
                    href={previewAttachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-brand-50 px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
                  >
                    Open {previewAttachment.name}
                  </a>
                )
              ) : (
                <div className="text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <EyeIcon className="h-5 w-5" />
                  </span>
                  <p className="mt-2 text-xs font-semibold text-slate-500">No live preview available</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{previewAttachment.name}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
              {previewAttachment.url && (
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  className="rounded-lg bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition cursor-pointer"
                >
                  Download
                </a>
              )}
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Confirm */}
      <ConfirmDialog
        open={discardOpen}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false)
          setModalOpen(false)
          reset()
        }}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[60] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 shadow-lg animate-in fade-in">
          {toastMessage}
        </div>
      )}
    </Layout>
  )
}