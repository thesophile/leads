import { useEffect, useMemo, useState } from 'react'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import PasswordInput from '../../components/PasswordInput'

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

function PhoneIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function LockIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}

function PowerIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-emerald-500' : 'text-red-400'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

const inputClass =
  'peer relative z-0 w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-3 text-xs text-slate-800 transition-all focus:outline-none focus:ring-4 focus:border-brand-500 focus:ring-brand-500/10'

function FloatingField({ label, id, value, onChange, type = 'text', icon }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="relative mt-2">
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
          {icon}
        </span>
      )}
      <input
        id={id}
        type={isPassword && show ? 'text' : type}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} ${icon ? 'pl-9' : ''} ${isPassword ? 'pr-9' : ''}`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-md p-1 text-slate-400 transition hover:text-slate-600"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {show ? (
              <>
                <path d="M4 4l16 16" />
                <path d="M9.6 5.7A9.6 9.6 0 0 1 12 5.5c5 0 8.6 4.2 9.5 6.5-.4.9-1.5 2.7-3.4 4.3M6.1 6.6C3.6 8.3 2.1 10.5 1.5 12c.9 2.3 4.5 6.5 10.5 6.5 2 0 3.8-.6 5.3-1.5" />
                <path d="M10 10.2a2.5 2.5 0 0 0 3.5 3.6" />
              </>
            ) : (
              <>
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                <circle cx="12" cy="12" r="2.8" />
              </>
            )}
          </svg>
        </button>
      )}
      <label
        htmlFor={id}
        className={`absolute ${icon ? 'left-8' : 'left-3'} -top-2 z-10 bg-white px-1 text-[10px] font-medium text-slate-500 transition-all pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-xs peer-placeholder-shown:text-slate-400 peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-brand-600`}
      >
        {label}
      </label>
    </div>
  )
}

const emptyForm = { name: '', email: '', phone: '', company: '', password: '' }

export default function Admins() {
  const { user } = useAuth()
  const [adminList, setAdminList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCredentials, setShowCredentials] = useState(null)
  const [resetModal, setResetModal] = useState(null)
  const [resetPw, setResetPw] = useState('')
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const admins = await api.get('/auth/admins/')
        if (!cancelled) setAdminList(admins)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function refreshData() {
    setLoading(true)
    setError('')
    try {
      const admins = await api.get('/auth/admins/')
      setAdminList(admins)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function isProtected(admin) {
    return admin.is_superuser || admin.email === user?.email
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (!editingId && !formData.company.trim()) {
      setError('Company name is required.')
      return
    }
    if (!editingId && formData.password.length < 8) {
      setError('Initial password must be at least 8 characters.')
      return
    }

    try {
      if (editingId) {
        await api.patch(`/auth/admins/${editingId}/`, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        })
        showToast('Admin updated.')
      } else {
        const created = await api.post('/auth/admins/', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          password: formData.password,
        })
        setShowCredentials({ email: created.email, password: formData.password })
        showToast('Admin added.')
      }
      setFormData(emptyForm)
      setEditingId(null)
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleEditClick(admin) {
    setEditingId(admin.id)
    setError('')
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      company: admin.company || '',
      password: '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setFormData(emptyForm)
  }

  async function handleToggleActive(admin) {
    try {
      await api.patch(`/auth/admins/${admin.id}/`, { is_active: !admin.is_active })
      showToast(admin.is_active ? `Deactivated ${admin.name}.` : `Activated ${admin.name}.`)
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    if (resetPw.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    try {
      await api.post(`/auth/admins/${resetModal.id}/reset-password/`, { new_password: resetPw })
      showToast(`Password updated for ${resetModal.name}.`)
      setResetModal(null)
      setResetPw('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete() {
    if (!deleteModal) return
    setDeleting(true)
    setError('')
    try {
      await api.del(`/auth/admins/${deleteModal.id}/`)
      showToast(`Deleted ${deleteModal.name}.`)
      setDeleteModal(null)
      await refreshData()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const filteredAdmins = useMemo(() => {
    if (!searchQuery.trim()) return adminList
    const q = searchQuery.toLowerCase()
    return adminList.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.company || '').toLowerCase().includes(q)
    )
  }, [adminList, searchQuery])

  const isEditing = Boolean(editingId)

  return (
    <Layout>
      <div className="space-y-6">
        {toast && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </span>
            <span className="text-xs font-semibold text-slate-800">{toast}</span>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admins</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage company administrators across all companies. Admins you add here are created with
            login credentials but never receive platform superadmin access.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr] items-start">
          {/* Form Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                {isEditing ? <RefreshIcon /> : <PlusCircleIcon />}
                <span>{isEditing ? 'Edit Admin' : 'Add Admin'}</span>
              </h2>
              {isEditing && (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 border border-amber-200/60">
                  Editing
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="mt-3 space-y-3">
              <FloatingField label="Full Name" id="adm_name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} icon={<UserIcon />} />

              <FloatingField label="Email" id="adm_email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} icon={<MailIcon />} />

              <FloatingField label="Phone" id="adm_phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} icon={<PhoneIcon />} />

              {!isEditing && (
                <FloatingField label="Company" id="adm_company" value={formData.company} onChange={(v) => setFormData({ ...formData, company: v })} icon={<BuildingIcon />} />
              )}

              {!isEditing && (
                <>
                  <FloatingField label="Password" id="adm_pw" type="password" value={formData.password} onChange={(v) => setFormData({ ...formData, password: v })} icon={<LockIcon />} />
                  <p className="text-[10px] text-slate-400">
                    This is the password the admin uses to sign in.
                  </p>
                </>
              )}

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
                  <span>{isEditing ? 'Update' : 'Add Admin'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Admin Table */}
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <TableIcon />
                <h2 className="text-base font-bold text-slate-900">
                  Admins <span className="text-xs font-medium text-slate-400">({filteredAdmins.length})</span>
                </h2>
              </div>
              <div className="relative sm:w-64">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search admins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <SpinnerIcon />
                <span className="mt-2 text-xs font-semibold text-slate-500">Loading admins...</span>
              </div>
            ) : filteredAdmins.length > 0 ? (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-2 font-semibold">Name</th>
                      <th className="pb-2 font-semibold">Email</th>
                      <th className="pb-2 font-semibold">Company</th>
                      <th className="pb-2 font-semibold w-24">Status</th>
                      <th className="pb-2 font-semibold text-left w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {filteredAdmins.map((admin) => {
                      const protectedAcct = isProtected(admin)
                      return (
                        <tr key={admin.id} onClick={() => { if (!protectedAcct) handleEditClick(admin) }} className={`text-slate-600 transition-colors ${protectedAcct ? '' : 'cursor-pointer'} ${editingId === admin.id ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'}`}>
                          <td className="py-1.5 pr-2 font-medium text-slate-800 text-xs truncate max-w-[180px]" title={admin.name}>
                            {admin.name}
                            {admin.email === user?.email && (
                              <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-600">You</span>
                            )}
                            {admin.is_superuser && (
                              <span className="ml-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-600">Superadmin</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-2 text-slate-600 text-xs">{admin.email}</td>
                          <td className="py-1.5 pr-2 text-slate-600 text-xs truncate max-w-[160px]" title={admin.company || ''}>{admin.company || '—'}</td>
                          <td className="py-1.5 pr-2">
                            {admin.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!protectedAcct) handleEditClick(admin)
                                }}
                                title={protectedAcct ? 'Superadmin accounts cannot be edited here' : 'Edit'}
                                disabled={protectedAcct}
                                className="rounded-lg p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setResetModal(admin)
                                  setResetPw('')
                                }}
                                title="Reset password"
                                className="rounded-lg p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              >
                                <KeyIcon />
                              </button>
                              {!protectedAcct && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleActive(admin)
                                  }}
                                  title={admin.is_active ? 'Deactivate' : 'Activate'}
                                  className="rounded-lg p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                >
                                  <PowerIcon active={admin.is_active} />
                                </button>
                              )}
                              {!protectedAcct && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteModal(admin)
                                  }}
                                  title="Delete"
                                  className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                {searchQuery ? `No admins match "${searchQuery}".` : 'No admins yet. Use the form to add your first admin.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New admin credentials modal */}
      {showCredentials && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCredentials(null)
              setResetModal(null)
              setDeleteModal(null)
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              </span>
              <h3 className="text-base font-bold text-slate-900">Admin added</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Share these login credentials with the admin.
            </p>
            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Email</span>
                <span className="font-mono font-semibold text-slate-800">{showCredentials.email}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Password</span>
                <span className="font-mono font-semibold text-slate-800">{showCredentials.password}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCredentials(null)}
              className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCredentials(null)
              setResetModal(null)
              setDeleteModal(null)
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Reset password</h3>
            <p className="mt-2 text-sm text-slate-500">
              Set a new password for <span className="font-semibold text-slate-700">{resetModal.name}</span>.
            </p>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-3">
              <PasswordInput
                id="reset_pw"
                value={resetPw}
                onChange={setResetPw}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
                placeholder="New password (min 8 chars)"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setResetModal(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm"
                >
                  Save password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCredentials(null)
              setResetModal(null)
              setDeleteModal(null)
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <TrashIcon />
              </span>
              <h3 className="text-base font-bold text-slate-900">Delete admin?</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              This permanently removes <span className="font-semibold text-slate-700">{deleteModal.name}</span> ({deleteModal.email}) and their login. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 shadow-sm disabled:opacity-60"
              >
                {deleting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
