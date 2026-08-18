import { useState, useMemo } from 'react'
import Layout from '../../Layout/Layout'

// Static staff master records
const STATIC_STAFF = [
  { id: '1', code: 'ST01', name: 'Shanu VR', role: 'Super Admin / Lead Manager', mobile: '8714546783', email: 'shanu@programers.com', branch: 'Corporate Head Office' },
  { id: '2', code: 'ST02', name: 'Alex Joseph', role: 'BDM (Business Development)', mobile: '9845123991', email: 'alex.j@programers.com', branch: 'Kochi Regional Hub' },
  { id: '3', code: 'ST03', name: 'Priya Sharma', role: 'Senior Telecaller', mobile: '9447118234', email: 'priya.s@programers.com', branch: 'Corporate Head Office' },
  { id: '4', code: 'ST04', name: 'Rahul Varma', role: 'Quotation Specialist', mobile: '9744882190', email: 'rahul.v@programers.com', branch: 'Calicut Cyberpark' },
  { id: '5', code: 'ST05', name: 'Ananya Nair', role: 'Telecaller', mobile: '9567112004', email: 'ananya@programers.com', branch: 'Trivandrum Branch' },
  { id: '6', code: 'ST06', name: 'Mohammed Farhan', role: 'Order Processing Manager', mobile: '9123456780', email: 'farhan@programers.com', branch: 'Bangalore Tech Branch' },
  { id: '7', code: 'ST07', name: 'Sneha Menon', role: 'Telecaller', mobile: '9895001122', email: 'sneha.m@programers.com', branch: 'Kochi Regional Hub' },
  { id: '8', code: 'ST08', name: 'Deepak Kumar', role: 'Sales Executive', mobile: '9946771122', email: 'deepak@programers.com', branch: 'Corporate Head Office' },
]

function PlusCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function RefreshIcon({ className = 'h-4.5 w-4.5 text-amber-500' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-800" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
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

function BriefcaseIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
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

function BuildingIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
      <path d="M16 8h3a1 1 0 0 1 1 1v12" />
      <path d="M7 7h2M7 11h2M7 15h2M11 7h2M11 11h2M11 15h2M3 21h19" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-7 w-7 text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function Staff() {
  const [staffList, setStaffList] = useState(STATIC_STAFF)
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    mobile: '',
    email: '',
    branch: '',
  })
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteModalId, setDeleteModalId] = useState(null)

  function handleSave(e) {
    e.preventDefault()
    if (!formData.name.trim()) return

    if (editingId) {
      setStaffList((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...item, ...formData } : item
        )
      )
      setEditingId(null)
    } else {
      const newStaff = {
        id: Date.now().toString(),
        code: `ST0${staffList.length + 1}`,
        ...formData,
      }
      setStaffList((prev) => [newStaff, ...prev])
    }
    setFormData({ name: '', role: '', mobile: '', email: '', branch: '' })
  }

  function handleEditClick(staff) {
    setIsLoading(true)
    setTimeout(() => {
      setEditingId(staff.id)
      setFormData({
        name: staff.name || '',
        role: staff.role || '',
        mobile: staff.mobile || '',
        email: staff.email || '',
        branch: staff.branch || '',
      })
      setIsLoading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 400)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setFormData({ name: '', role: '', mobile: '', email: '', branch: '' })
  }

  function confirmDelete(id) {
    setStaffList((prev) => prev.filter((item) => item.id !== id))
    setDeleteModalId(null)
  }

  // Filtered staff based on search query
  const filteredStaff = useMemo(() => {
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mobile.includes(searchQuery) ||
        s.branch.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [staffList, searchQuery])

  const isEditing = Boolean(editingId)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Main Grid: Left Compact Form + Right Wide Staff Table */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr] items-start">
          {/* Left Form Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs transition-all">
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs transition-opacity">
                <SpinnerIcon />
                <span className="mt-2 text-xs font-semibold text-slate-600">Loading staff data...</span>
              </div>
            )}

            {/* Form Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                {isEditing ? (
                  <RefreshIcon className="h-4.5 w-4.5 text-amber-500" />
                ) : (
                  <PlusCircleIcon />
                )}
                <span>{isEditing ? 'Edit Staff' : 'Add New Staff'}</span>
              </h2>

              {isEditing && (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 border border-amber-200/60">
                  Editing Mode
                </span>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="mt-3 space-y-3">
              {/* Staff Name Input */}
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <UserIcon className="h-3.5 w-3.5" />
                </span>
                <input
                  id="staff_name_input"
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`peer relative z-0 w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:outline-none focus:ring-4 ${
                    isEditing
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/10'
                      : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10'
                  }`}
                />
                <label
                  htmlFor="staff_name_input"
                  className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                    formData.name
                      ? '-top-2 text-slate-500'
                      : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                  } peer-focus:-top-2 peer-focus:text-[10px] ${
                    isEditing ? 'peer-focus:text-amber-600' : 'peer-focus:text-brand-600'
                  }`}
                >
                  Full Name
                </label>
              </div>

              {/* Designation / Role */}
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <BriefcaseIcon className="h-3.5 w-3.5" />
                </span>
                <input
                  id="staff_role_input"
                  type="text"
                  placeholder="Designation / Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={`peer relative z-0 w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:outline-none focus:ring-4 ${
                    isEditing
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/10'
                      : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10'
                  }`}
                />
                <label
                  htmlFor="staff_role_input"
                  className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                    formData.role
                      ? '-top-2 text-slate-500'
                      : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                  } peer-focus:-top-2 peer-focus:text-[10px] ${
                    isEditing ? 'peer-focus:text-amber-600' : 'peer-focus:text-brand-600'
                  }`}
                >
                  Designation / Role
                </label>
              </div>

              {/* Mobile Number */}
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <PhoneIcon className="h-3.5 w-3.5" />
                </span>
                <input
                  id="staff_mobile_input"
                  type="text"
                  placeholder="Mobile Number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className={`peer relative z-0 w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:outline-none focus:ring-4 ${
                    isEditing
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/10'
                      : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10'
                  }`}
                />
                <label
                  htmlFor="staff_mobile_input"
                  className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                    formData.mobile
                      ? '-top-2 text-slate-500'
                      : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                  } peer-focus:-top-2 peer-focus:text-[10px] ${
                    isEditing ? 'peer-focus:text-amber-600' : 'peer-focus:text-brand-600'
                  }`}
                >
                  Mobile Number
                </label>
              </div>

              {/* Email Address */}
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <MailIcon className="h-3.5 w-3.5" />
                </span>
                <input
                  id="staff_email_input"
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`peer relative z-0 w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:outline-none focus:ring-4 ${
                    isEditing
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/10'
                      : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10'
                  }`}
                />
                <label
                  htmlFor="staff_email_input"
                  className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                    formData.email
                      ? '-top-2 text-slate-500'
                      : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                  } peer-focus:-top-2 peer-focus:text-[10px] ${
                    isEditing ? 'peer-focus:text-amber-600' : 'peer-focus:text-brand-600'
                  }`}
                >
                  Email Address
                </label>
              </div>

              {/* Branch Selection */}
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <BuildingIcon className="h-3.5 w-3.5" />
                </span>
                <select
                  id="staff_branch_select"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className={`peer relative z-0 w-full cursor-pointer rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 transition-all focus:outline-none focus:ring-4 ${
                    isEditing
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/10'
                      : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10'
                  }`}
                >
                  <option value="" disabled hidden>
                    Select Branch
                  </option>
                  <option value="Corporate Head Office">Corporate Head Office</option>
                  <option value="Kochi Regional Hub">Kochi Regional Hub</option>
                  <option value="Trivandrum Branch">Trivandrum Branch</option>
                  <option value="Bangalore Tech Branch">Bangalore Tech Branch</option>
                  <option value="Calicut Cyberpark">Calicut Cyberpark</option>
                </select>
                <label
                  htmlFor="staff_branch_select"
                  className={`absolute left-8 -top-2 z-10 bg-white px-1 text-[10px] font-medium transition-all cursor-pointer ${
                    isEditing ? 'text-amber-600' : 'text-slate-500 peer-focus:text-brand-600'
                  }`}
                >
                  Branch
                </label>
              </div>

              {/* Form Buttons */}
              <div className={`flex items-center gap-2 pt-1 ${isEditing ? '' : 'justify-end'}`}>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                    isEditing
                      ? 'flex-1 bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                      : 'w-full bg-brand-600 hover:bg-brand-700 shadow-brand-600/10'
                  }`}
                >
                  {isEditing ? <RefreshIcon className="h-3.5 w-3.5 text-white" /> : <SaveIcon />}
                  <span>{isEditing ? 'Update' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Staff List Card */}
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            {/* Header with Title & Search Input */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <TableIcon />
                <h2 className="text-base font-bold text-slate-900">Staff Records</h2>
              </div>

              {/* Search Box */}
              <div className="flex items-center">
                <div className="relative flex-1 sm:w-64">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-l-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Search"
                  className="flex h-[38px] w-10 items-center justify-center rounded-r-lg bg-brand-600 text-white transition hover:bg-brand-700"
                >
                  <SearchIcon />
                </button>
              </div>
            </div>

            {/* Staff Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <th className="pb-2 font-semibold w-20">Code</th>
                    <th className="pb-2 font-semibold w-40">Staff Name</th>
                    <th className="pb-2 font-semibold w-44">Role</th>
                    <th className="pb-2 font-semibold w-28">Mobile</th>
                    <th className="pb-2 font-semibold w-36">Branch</th>
                    <th className="pb-2 font-semibold text-left w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {filteredStaff.length > 0 ? (
                    filteredStaff.map((staff) => (
                      <tr
                        key={staff.id}
                        className={`text-slate-600 transition-colors ${
                          editingId === staff.id ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="py-1.5 pr-2">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                            {staff.code}
                          </span>
                        </td>
                        <td className="py-1.5 pr-2 font-medium text-slate-800 text-xs">
                          {staff.name}
                        </td>
                        <td className="py-1.5 pr-2 text-slate-600 text-xs">
                          {staff.role}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs text-slate-600">
                          {staff.mobile}
                        </td>
                        <td className="py-1.5 pr-2 text-slate-600 text-xs">
                          {staff.branch}
                        </td>
                        <td className="py-1.5 pr-2 text-left">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditClick(staff)}
                              title="Edit Staff"
                              className="rounded-lg p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteModalId(staff.id)}
                              title="Delete Staff"
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
                      <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                        No staff members found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Static Pagination Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400 font-medium">
                Showing 1 to {filteredStaff.length} of {filteredStaff.length} entries
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Staff</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete this staff record? This action cannot be undone.
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
    </Layout>
  )
}
