import { useEffect, useMemo, useState } from 'react'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'

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

function BuildingIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
      <path d="M16 8h3a1 1 0 0 1 1 1v12" />
      <path d="M7 7h2M7 11h2M7 15h2M11 7h2M11 11h2M11 15h2M3 21h19" />
    </svg>
  )
}

function MapPinIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
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

function truncateName(name) {
  return name.length > 25 ? name.slice(0, 25) + '…' : name
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-7 w-7 text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function Branch() {
  const [branches, setBranches] = useState([])
  const [branchName, setBranchName] = useState('')
  const [branchAddress, setBranchAddress] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteModalId, setDeleteModalId] = useState(null)
  const pageSize = 50

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const data = await api.get('/master/branches/')
        if (!cancelled) setBranches(data)
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

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!branchName.trim()) {
      setError('Branch name is required.')
      return
    }

    try {
      if (editingId) {
        await api.patch(`/master/branches/${editingId}/`, {
          name: branchName.trim(),
          address: branchAddress.trim(),
        })
        showToast('Branch updated.')
      } else {
        await api.post('/master/branches/', {
          name: branchName.trim(),
          address: branchAddress.trim(),
        })
        showToast('Branch added.')
      }
      setBranchName('')
      setBranchAddress('')
      setEditingId(null)
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function refreshData() {
    setIsLoading(true)
    setError('')
    try {
      const data = await api.get('/master/branches/')
      setBranches(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleEditClick(br) {
    setEditingId(br.id)
    setBranchName(br.name)
    setBranchAddress(br.address || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setBranchName('')
    setBranchAddress('')
  }

  async function confirmDelete(id) {
    setDeleteModalId(null)
    try {
      await api.del(`/master/branches/${id}/`)
      showToast('Branch deleted.')
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  // Filtered branches based on search
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches
    const q = searchQuery.toLowerCase()
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.address || '').toLowerCase().includes(q)
    )
  }, [branches, searchQuery])

  // Pagination calculations
  const totalPages = Math.ceil(filteredBranches.length / pageSize) || 1
  const paginatedBranches = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredBranches.slice(start, start + pageSize)
  }, [filteredBranches, currentPage, pageSize])

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

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {/* Main Grid: Left Add/Edit Form + Right Branch List Table */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Form Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-4 transition-all">
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs transition-opacity">
                <SpinnerIcon />
                <span className="mt-2 text-xs font-semibold text-slate-600">Loading branch data...</span>
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
                <span>{isEditing ? 'Edit Branch' : 'Add Branch'}</span>
              </h2>

              {isEditing && (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 border border-amber-200/60">
                  Editing Mode
                </span>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="mt-3 space-y-3">
              {/* Branch Name Floating Label Input */}
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <BuildingIcon className="h-3.5 w-3.5" />
                </span>
                <input
                  id="branch_name_input"
                  type="text"
                  placeholder="Branch Name"
                  maxLength={50}
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className={`peer relative z-0 w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:outline-none focus:ring-4 ${
                    isEditing
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/10'
                      : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10'
                  }`}
                />
                <label
                  htmlFor="branch_name_input"
                  className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                    branchName
                      ? '-top-2 text-slate-500'
                      : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                  } peer-focus:-top-2 peer-focus:text-[10px] ${
                    isEditing ? 'peer-focus:text-amber-600' : 'peer-focus:text-brand-600'
                  }`}
                >
                  Branch Name
                </label>
              </div>

              {/* Branch Address Floating Label Input */}
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-slate-400">
                  <MapPinIcon className="h-3.5 w-3.5" />
                </span>
                <input
                  id="branch_address_input"
                  type="text"
                  placeholder="Branch Address"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className={`peer relative z-0 w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-transparent transition-all focus:outline-none focus:ring-4 ${
                    isEditing
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/10'
                      : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10'
                  }`}
                />
                <label
                  htmlFor="branch_address_input"
                  className={`absolute left-8 bg-white px-1 text-[10px] font-medium transition-all z-10 cursor-text ${
                    branchAddress
                      ? '-top-2 text-slate-500'
                      : 'top-2 text-xs text-slate-400 peer-placeholder-shown:text-xs peer-placeholder-shown:top-2'
                  } peer-focus:-top-2 peer-focus:text-[10px] ${
                    isEditing ? 'peer-focus:text-amber-600' : 'peer-focus:text-brand-600'
                  }`}
                >
                  Address
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

          {/* Right Branch List Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-8">
            {/* Header with Title & Search Input */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <TableIcon />
                <h2 className="text-base font-bold text-slate-900">Branch List</h2>
              </div>

              {/* Search Box */}
              <div className="flex items-center">
                <div className="relative flex-1 sm:w-64">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
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

            {/* Branch Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <th className="pb-2 font-semibold w-48">Branch Name</th>
                    <th className="pb-2 font-semibold">Address</th>
                    <th className="pb-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {paginatedBranches.length > 0 ? (
                    paginatedBranches.map((br) => (
                      <tr
                        key={br.id}
                        onClick={() => handleEditClick(br)}
                        className={`text-slate-600 transition-colors cursor-pointer ${
                          editingId === br.id ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="py-0.5 pr-2 font-medium text-slate-700 text-xs truncate max-w-[180px]" title={br.name}>
                          {truncateName(br.name)}
                        </td>
                        <td className="py-0.5 pr-2">
                          <span
                            className="block truncate text-xs text-slate-500"
                            title={br.address || ''}
                          >
                            {br.address || '—'}
                          </span>
                        </td>
                        <td className="py-0.5 pr-2 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => handleEditClick(br)}
                              title="Edit Branch"
                              className="rounded-lg p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteModalId(br.id)
                              }}
                              title="Delete Branch"
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
                      <td colSpan={3} className="py-6 text-center text-xs text-slate-400">
                        {isLoading
                          ? 'Loading branches...'
                          : searchQuery
                            ? `No branches found matching "${searchQuery}"`
                            : 'No branches yet. Use the form to add your first branch.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400 font-medium">
                Showing{' '}
                {filteredBranches.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                {Math.min(currentPage * pageSize, filteredBranches.length)} of{' '}
                {filteredBranches.length} entries
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-6 h-6 flex items-center justify-center rounded-md font-semibold transition-colors ${
                      currentPage === pageNum
                        ? 'bg-brand-50 text-brand-600 font-bold border border-brand-200/60'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium cursor-pointer"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModalId(null)
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Branch</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete this branch? This action cannot be undone.
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
