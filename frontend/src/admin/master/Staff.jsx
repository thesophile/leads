import { useEffect, useMemo, useState } from 'react'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import PasswordInput from '../../components/PasswordInput'

const ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'telecaller', label: 'Telecaller' },
  { value: 'bd', label: 'Business Development' },
  { value: 'manager', label: 'Manager' },
  { value: 'accounts', label: 'Accounts' },
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

export default function Staff() {
  const { user } = useAuth()
  const [staffList, setStaffList] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branch: '',
    role: 'staff',
    password: '',
  })
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCredentials, setShowCredentials] = useState(null) // newly created creds
  const [resetModal, setResetModal] = useState(null) // user object for reset
  const [resetPw, setResetPw] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [users, branchRes] = await Promise.all([
          api.get('/auth/users/'),
          api.get('/master/branches/').catch(() => []),
        ])
        if (!cancelled) {
          setStaffList(users)
          setBranches(branchRes)
        }
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
      const [users, branchRes] = await Promise.all([
        api.get('/auth/users/'),
        api.get('/master/branches/').catch(() => []),
      ])
      setStaffList(users)
      setBranches(branchRes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (!editingId && formData.password.length < 8) {
      setError('Initial password must be at least 8 characters.')
      return
    }

    try {
      if (editingId) {
        const payload = {
          name: formData.name,
          phone: formData.phone,
          branch: formData.branch,
          role: formData.role,
        }
        await api.patch(`/auth/users/${editingId}/`, payload)
        showToast('Employee updated.')
      } else {
        const created = await api.post('/auth/users/', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          mobile: formData.phone,
          branch: formData.branch,
          role: formData.role,
          password: formData.password,
        })
        setShowCredentials({ email: created.email, password: formData.password })
        showToast('Employee added.')
      }
      setFormData({ name: '', email: '', phone: '', branch: '', role: 'staff', password: '' })
      setEditingId(null)
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleEditClick(emp) {
    setEditingId(emp.id)
    setError('')
    setFormData({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      branch: emp.branch_name || '',
      role: emp.role || 'staff',
      password: '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setFormData({ name: '', email: '', phone: '', branch: '', role: 'staff', password: '' })
  }

  async function handleToggleActive(emp) {
    try {
      await api.patch(`/auth/users/${emp.id}/`, { is_active: !emp.is_active })
      showToast(emp.is_active ? `Deactivated ${emp.name}.` : `Activated ${emp.name}.`)
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
      await api.post(`/auth/users/${resetModal.id}/reset-password/`, { new_password: resetPw })
      showToast(`Password updated for ${resetModal.name}.`)
      setResetModal(null)
      setResetPw('')
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList
    const q = searchQuery.toLowerCase()
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.staff_code || '').toLowerCase().includes(q) ||
        (s.role || '').toLowerCase().includes(q)
    )
  }, [staffList, searchQuery])

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            {user?.company ? (
              <>
                Manage staff for <span className="font-semibold text-slate-700">{user.company}</span>. Adding an employee
                creates their login — staff do not self-register.
              </>
            ) : (
              'Manage staff logins for your organization.'
            )}
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
                <span>{isEditing ? 'Edit Employee' : 'Add Employee'}</span>
              </h2>
              {isEditing && (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 border border-amber-200/60">
                  Editing
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="mt-3 space-y-3">
              <FloatingField label="Full Name" id="emp_name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} icon={<UserIcon />} />

              <FloatingField label="Email" id="emp_email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} icon={<MailIcon />} />

              <FloatingField label="Phone" id="emp_phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />

              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <BuildingIcon />
                </span>
                <select
                  id="emp_branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className={`${inputClass} ${formData.branch ? '' : 'text-slate-400'} cursor-pointer pl-9`}
                >
                  <option value="" disabled hidden>
                    Select Branch
                  </option>
                  {branches.length === 0 && <option value="" disabled>No branches yet</option>}
                  {branches.map((b) => (
                    <option key={b.id} value={b.name} className="text-slate-800">
                      {b.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="emp_branch" className="absolute left-8 -top-2 z-10 bg-white px-1 text-[10px] font-medium pointer-events-none text-slate-500">
                  Branch
                </label>
              </div>

              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <BriefcaseIcon />
                </span>
                <select
                  id="emp_role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={`${inputClass} cursor-pointer pl-9`}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="emp_role" className="absolute left-8 -top-2 z-10 bg-white px-1 text-[10px] font-medium pointer-events-none text-slate-500">
                  Role
                </label>
              </div>

              {!isEditing && (
                <>
                  <FloatingField label="Password" id="emp_pw" type="password" value={formData.password} onChange={(v) => setFormData({ ...formData, password: v })} />
                  <p className="text-[10px] text-slate-400">
                    This is the password the employee uses to sign in.
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
                  <span>{isEditing ? 'Update' : 'Add Employee'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Employee Table */}
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <TableIcon />
                <h2 className="text-base font-bold text-slate-900">
                  Employees <span className="text-xs font-medium text-slate-400">({filteredStaff.length})</span>
                </h2>
              </div>
              <div className="relative sm:w-64">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <SpinnerIcon />
                <span className="mt-2 text-xs font-semibold text-slate-500">Loading employees...</span>
              </div>
            ) : filteredStaff.length > 0 ? (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-2 font-semibold w-20">Code</th>
                      <th className="pb-2 font-semibold">Name</th>
                      <th className="pb-2 font-semibold">Email</th>
                      <th className="pb-2 font-semibold w-32">Role</th>
                      <th className="pb-2 font-semibold w-20">Status</th>
                      <th className="pb-2 font-semibold text-left w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {filteredStaff.map((emp) => (
                      <tr key={emp.id} onClick={() => handleEditClick(emp)} className={`text-slate-600 transition-colors cursor-pointer ${editingId === emp.id ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'}`}>
                        <td className="py-1.5 pr-2">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                            {emp.staff_code || '—'}
                          </span>
                        </td>
                        <td className="py-1.5 pr-2 font-medium text-slate-800 text-xs truncate max-w-[180px]" title={emp.name}>
                          {emp.name}
                          {emp.email === user?.email && (
                            <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-600">You</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-slate-600 text-xs">{emp.email}</td>
                        <td className="py-1.5 pr-2">
                          <span className="capitalize text-slate-600">{emp.role}</span>
                        </td>
                        <td className="py-1.5 pr-2">
                          {emp.is_active ? (
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
                                handleEditClick(emp)
                              }}
                              title="Edit"
                              className="rounded-lg p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setResetModal(emp)
                                setResetPw('')
                              }}
                              title="Reset password"
                              className="rounded-lg p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            >
                              <KeyIcon />
                            </button>
                            {emp.email !== user?.email && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleActive(emp)
                                }}
                                title={emp.is_active ? 'Deactivate' : 'Activate'}
                                className="rounded-lg p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <PowerIcon active={emp.is_active} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                {searchQuery ? `No employees match "${searchQuery}".` : 'No employees yet. Use the form to add your first employee.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New employee credentials modal */}
      {showCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              </span>
              <h3 className="text-base font-bold text-slate-900">Employee added</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Share these login credentials with the employee.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
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
    </Layout>
  )
}
