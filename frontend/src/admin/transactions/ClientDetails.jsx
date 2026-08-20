import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../../Layout/Layout'

const ATTACHMENT_TYPES = ['SRS Document', 'Business Card', 'Voice Clip', 'Other']

const INITIAL_CLIENT_DETAILS = [
  {
    id: 'CD-001',
    orderNo: 'ORD-2026-001',
    leadId: 'TC-108',
    clientName: 'Karthika Nambeesan',
    company: 'NAMBEESANS LAKSHMI LODGE',
    mobile: '9447151442',
    email: 'bookings@nambeesanslodge.com',
    category: 'Dynamic Website',
    acceptedDate: '2026-08-12',
    collectedBy: 'Bincy',
    notes: 'SRS and business card handed over during site visit.',
    attachments: [
      { id: 1, type: 'SRS Document', name: 'nambeesans-srs.pdf', mime: 'application/pdf', size: '2.4 MB', url: '' },
      { id: 2, type: 'Business Card', name: 'nambeesans-business-card.jpg', mime: 'image/jpeg', size: '310 KB', url: '' },
    ],
    status: 'Details Complete',
  },
  {
    id: 'CD-002',
    orderNo: 'ORD-2026-002',
    leadId: 'TC-103',
    clientName: 'Dr. Manzoor Ali',
    company: 'MANZOOR SUPER SPECIALITY HOSPITAL',
    mobile: '9447118234',
    email: 'director@manzoorhospital.org',
    category: 'Dynamic Web & OPD Suite',
    acceptedDate: '2026-08-11',
    collectedBy: 'Priya Sharma',
    notes: 'Awaiting SRS document from hospital IT team.',
    attachments: [],
    status: 'Details Pending',
  },
  {
    id: 'CD-003',
    orderNo: 'ORD-2026-003',
    leadId: 'TC-105',
    clientName: 'Kabeer Khan',
    company: 'ROYAL PALACE CONVENTION CENTRE',
    mobile: '9567112004',
    email: 'events@royalpalacekerala.com',
    category: 'Dynamic Website',
    acceptedDate: '2026-08-10',
    collectedBy: 'Ananya Nair',
    notes: 'Requirements captured in a voice clip.',
    attachments: [
      { id: 1, type: 'Voice Clip', name: 'royal-palace-requirements.m4a', mime: 'audio/mp4', size: '1.1 MB', url: '' },
    ],
    status: 'Details Complete',
  },
  {
    id: 'CD-004',
    orderNo: 'ORD-2026-004',
    leadId: 'TC-102',
    clientName: 'Rahul Menon',
    company: 'SHADES.IN LUXURY EYEWEAR',
    mobile: '9845123991',
    email: 'management@shades.in',
    category: 'Meta Ads',
    acceptedDate: '2026-08-08',
    collectedBy: 'Alex Joseph',
    notes: 'Business card and ad copy brief received.',
    attachments: [
      { id: 1, type: 'Business Card', name: 'shades-business-card.jpg', mime: 'image/jpeg', size: '285 KB', url: '' },
      { id: 2, type: 'SRS Document', name: 'shades-brief.pdf', mime: 'application/pdf', size: '980 KB', url: '' },
    ],
    status: 'Details Complete',
  },
]

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

const STATUS_LIST = ['All Status', 'Details Complete', 'Details Pending']

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

  const [records, setRecords] = useState(INITIAL_CLIENT_DETAILS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('All Staff')
  const [selectedStatus, setSelectedStatus] = useState('All Status')

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
          acceptedDate: new Date().toISOString().slice(0, 10),
          collectedBy: prefilledOrder.proposalBy || prefilledOrder.staff || '',
          notes: '',
        }
      : EMPTY_FORM
  )
  const [newAttachments, setNewAttachments] = useState([])
  const [selectedFileType, setSelectedFileType] = useState('SRS Document')
  const [toastMessage, setToastMessage] = useState('')

  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  // Clear router state after prefill so a refresh doesn't reopen the form
  useEffect(() => {
    if (location.state?.order) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesStaff = selectedStaff === 'All Staff' || rec.collectedBy === selectedStaff
      const matchesStatus = selectedStatus === 'All Status' || rec.status === selectedStatus

      let matchesSearch = true
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        matchesSearch =
          rec.clientName.toLowerCase().includes(q) ||
          rec.company.toLowerCase().includes(q) ||
          rec.orderNo.toLowerCase().includes(q) ||
          rec.mobile.includes(q) ||
          rec.collectedBy.toLowerCase().includes(q) ||
          rec.category.toLowerCase().includes(q)
      }

      return matchesStaff && matchesStatus && matchesSearch
    })
  }, [records, selectedStaff, selectedStatus, searchQuery])

  const totalCount = records.length
  const completeCount = records.filter((r) => r.status === 'Details Complete').length
  const pendingCount = records.filter((r) => r.status === 'Details Pending').length

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

  function handleField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    const added = files.map((file) => ({
      id: Date.now() + Math.random(),
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

  function handleSave(e) {
    e.preventDefault()

    if (editingId) {
      setRecords((prev) =>
        prev.map((rec) =>
          rec.id === editingId
            ? {
                ...rec,
                ...form,
                attachments: [...rec.attachments, ...newAttachments],
                status: rec.attachments.length + newAttachments.length > 0 ? 'Details Complete' : 'Details Pending',
              }
            : rec
        )
      )
      setToastMessage('✓ Client details updated!')
    } else {
      const nextId = `CD-${String(records.length + 1).padStart(3, '0')}`
      const newRecord = {
        id: nextId,
        leadId: '',
        ...form,
        attachments: newAttachments,
        status: newAttachments.length > 0 ? 'Details Complete' : 'Details Pending',
      }
      setRecords([newRecord, ...records])
      setToastMessage('✓ Client details collected!')
    }

    setModalOpen(false)
    setNewAttachments([])
    setTimeout(() => setToastMessage(''), 2500)
  }

  function handleStatusChange(id, newStatus) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)))
  }

  function confirmDelete() {
    setRecords((prev) => prev.filter((r) => r.id !== deleteId))
    setDeleteId(null)
    setToastMessage('✓ Record removed.')
    setTimeout(() => setToastMessage(''), 2500)
  }

  function isImage(att) {
    return (att.mime || '').startsWith('image/')
  }
  function isAudio(att) {
    return (att.mime || '').startsWith('audio/')
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Client Details Collection
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Collect SRS, business cards, voice clips and notes from clients who accepted their orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Collected</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">{totalCount}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Clients</span>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Details Complete</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-emerald-800">{completeCount}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Ready</span>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Details Pending</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-amber-800">{pendingCount}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Pending</span>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
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
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} onClick={() => openEditModal(rec)} className="text-slate-600 hover:bg-slate-50/60 transition-colors cursor-pointer">
                      <td className="py-2.5 pr-3 font-mono font-bold text-slate-950">{rec.orderNo}</td>
                      <td className="py-2.5 pr-3 min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[160px]" title={rec.clientName}>{rec.clientName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={rec.company}>{rec.company}</div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-600">{rec.mobile}</td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {rec.category}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                          {rec.collectedBy}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
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
                      <td className="py-2.5 pr-3">
                        <select
                          value={rec.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(rec.id, e.target.value)}
                          title="Change status"
                          aria-label={`Status for ${rec.clientName}`}
                          className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 ${
                            rec.status === 'Details Complete'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          <option value="Details Complete">Details Complete</option>
                          <option value="Details Pending">Details Pending</option>
                        </select>
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteId(rec.id)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                            title="Delete"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
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
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-white">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Client Details' : 'Collect Client Details'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
                  Attach SRS, business card image, voice clip or any other handover file. Files are kept in-session only.
                </p>

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
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 transition cursor-pointer shadow-xs"
                >
                  {editingId ? 'Save Changes' : 'Save Client Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Attachment Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
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
                  <p className="mt-2 text-xs font-semibold text-slate-500">No live preview for this demo record</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{previewAttachment.name}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
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

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
              <TrashIcon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-bold text-slate-900">Delete client details?</h3>
            <p className="mt-1 text-xs text-slate-500">
              This will permanently remove the collected details and attachments.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[60] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 shadow-lg animate-in fade-in">
          {toastMessage}
        </div>
      )}
    </Layout>
  )
}