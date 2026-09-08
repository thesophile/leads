import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import { exportRegisterPdf } from '../../utils/exportRegisterPdf'

function PackageIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  )
}

function DownloadIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ClipboardListIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  )
}

function CloseIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function sameText(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase()
}

// Best-effort parse of free-text order dates into a comparable ISO string.
function toIsoDate(value) {
  if (!value) return ''
  const text = String(value).trim()
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (a) return a[0]
  const d = /^(\d{2})-(\d{2})-(\d{4})/.exec(text)
  if (d) return `${d[3]}-${d[2]}-${d[1]}`
  const s = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(text)
  if (s) return `${s[3]}-${s[2]}-${s[1]}`
  return ''
}

// Client-detail status -> register "Collected"/"Pending" summary.
function detailsStatusOf(clientDetail) {
  const status = clientDetail?.status || ''
  if (['Details Complete', 'Completed', 'Paid'].includes(status)) return 'Collected'
  return 'Pending'
}

// Map an order returned by the backend (merged with its client-detail record)
// into the register row shape.
function orderToRow(order, detailMap) {
  const iso = toIsoDate(order.date)
  const cd = detailMap.get(order.id)
  return {
    id: order.id,
    orderNo: order.id || '',
    leadId: order.leadId || '',
    date: order.date || '',
    rawDate: iso,
    company: order.company || '',
    customer: order.customer || cd?.clientName || '',
    mobile: order.mobile || '',
    email: order.email || '',
    location: order.city || '',
    staff: order.staff || '',
    bdm: order.bdm || '',
    category: order.category || '',
    detailsStatus: detailsStatusOf(cd),
    remarks: order.remarks || '',
  }
}

export default function OrderReceived() {
  const navigate = useNavigate()

  const [registerRows, setRegisterRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('All Category')
  const [staff, setStaff] = useState('All Staff')
  const [detailsStatus, setDetailsStatus] = useState('All Details')
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedOrder, setSelectedOrder] = useState(null)

  // Load the real orders + their client-detail records from the database.
  useEffect(() => {
    let cancelled = false

    async function fetchOrders() {
      setIsLoading(true)
      setError('')
      try {
        const [orders, clientDetails] = await Promise.all([
          api.get('/transactions/orders/'),
          api.get('/transactions/client-details/'),
        ])
        if (cancelled) return
        const detailMap = new Map()
        ;(Array.isArray(clientDetails) ? clientDetails : []).forEach((cd) => {
          if (cd.orderNo && !detailMap.has(cd.orderNo)) detailMap.set(cd.orderNo, cd)
        })
        setRegisterRows(
          (Array.isArray(orders) ? orders : []).map((o) => orderToRow(o, detailMap))
        )
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchOrders()
    return () => {
      cancelled = true
    }
  }, [])

  // Staff choices are derived from the actual records so the filters always
  // match what the current user is allowed to see.
  const staffOptions = useMemo(() => {
    const names = [...new Set(registerRows.map((r) => r.staff).filter(Boolean))]
    return ['All Staff', ...names.sort((a, b) => a.localeCompare(b))]
  }, [registerRows])

  const categoryOptions = useMemo(() => {
    const values = [...new Set(registerRows.map((r) => r.category).filter(Boolean))]
    return ['All Category', ...values.sort((a, b) => a.localeCompare(b))]
  }, [registerRows])

  const [isExporting, setIsExporting] = useState(false)

  const hasActiveFilters =
    fromDate !== '' ||
    toDate !== '' ||
    category !== 'All Category' ||
    staff !== 'All Staff' ||
    detailsStatus !== 'All Details' ||
    searchQuery.trim() !== ''

  function clearAllFilters() {
    setFromDate('')
    setToDate('')
    setCategory('All Category')
    setStaff('All Staff')
    setDetailsStatus('All Details')
    setSearchQuery('')
  }

  // Filters apply live as the user changes them — no Apply button needed.
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return registerRows.filter((item) => {
      // Date filter
      if (fromDate && item.rawDate < fromDate) return false
      if (toDate && item.rawDate > toDate) return false

      // Category filter
      if (category !== 'All Category' && !sameText(item.category, category)) return false

      // Staff filter
      if (staff !== 'All Staff' && !sameText(item.staff, staff)) return false

      // Client details status filter
      if (detailsStatus !== 'All Details' && !sameText(item.detailsStatus, detailsStatus)) return false

      // Search query
      if (q) {
        return (
          item.orderNo.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q) ||
          item.mobile.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.staff.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [registerRows, fromDate, toDate, category, staff, detailsStatus, searchQuery])

  const totalConvertedCount = filteredData.length
  const pendingDetailsCount = filteredData.filter((i) => i.detailsStatus === 'Pending').length
  const collectedDetailsCount = filteredData.filter((i) => i.detailsStatus === 'Collected').length

  async function exportPdf() {
    if (isExporting) return
    setIsExporting(true)
    try {
      await exportRegisterPdf({
        title: 'CONVERTED CLIENTS REGISTER',
        fileNamePrefix: 'Converted_Clients_Register',
        columns: ['Order No', 'Date', 'Company', 'Customer', 'Phone', 'Location', 'Staff', 'BDM', 'Category', 'Client Details'],
        rows: filteredData.map((r) => [
          r.orderNo,
          r.date,
          r.company,
          r.customer,
          r.mobile,
          r.location,
          r.staff,
          r.bdm,
          r.category,
          r.detailsStatus,
        ]),
        filters: {
          Category: category !== 'All Category' ? category : '',
          Staff: staff !== 'All Staff' ? staff : '',
          Details: detailsStatus !== 'All Details' ? detailsStatus : '',
          From: fromDate || '',
          To: toDate || '',
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 55 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 70 },
          5: { cellWidth: 'auto' },
          6: { cellWidth: 'auto' },
          7: { cellWidth: 'auto' },
          8: { cellWidth: 'auto' },
          9: { cellWidth: 'auto' },
        },
      })
    } finally {
      setIsExporting(false)
    }
  }

  function handleExportCSV() {
    const headers = [
      'Sl No',
      'Order No',
      'Date',
      'Company Name',
      'Customer',
      'Phone',
      'Location',
      'Staff',
      'Category',
      'Client Details',
    ]

    const rows = filteredData.map((o, idx) => [
      idx + 1,
      `"${o.orderNo}"`,
      `"${o.date}"`,
      `"${o.company}"`,
      `"${o.customer}"`,
      `"${o.mobile}"`,
      `"${o.location}"`,
      `"${o.staff}"`,
      `"${o.category}"`,
      `"${o.detailsStatus}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Converted_Clients_Register_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getDetailsBadge(st) {
    return st === 'Collected'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-amber-50 text-amber-700 border-amber-200'
  }

  return (
    <Layout>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 print:hidden">
            Could not load converted clients register: {error}
          </div>
        )}

        {/* Printable Official Header */}
        <div className="hidden print:block border-b pb-4 mb-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">LEADS — CONVERTED CLIENTS REGISTER</h1>
            <p className="text-xs text-slate-500">Log of client orders accepted and details collected for handover</p>
            <p className="text-[10px] text-slate-400 mt-1">Generated on: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Top Header & Filter Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5 text-slate-800 font-bold text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-black">
                <PackageIcon className="h-4.5 w-4.5" />
              </span>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Converted Clients Register</h1>
                <p className="text-[11px] font-normal text-slate-500">Orders accepted by clients, ready for details collection</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={exportPdf}
                disabled={isLoading || isExporting}
                title={isLoading ? 'Wait for the register to load before exporting.' : 'Download register as PDF'}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isExporting ? '⏳' : '📄'}</span>
                <span>{isExporting ? 'Exporting…' : 'Export PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer active:scale-95"
                title="Export as CSV"
              >
                <DownloadIcon />
                <span>Export CSV</span>
              </button>

              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-l-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-48"
                />
                <button
                  type="button"
                  onClick={() => {}}
                  className="rounded-r-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 transition flex items-center justify-center cursor-pointer"
                  title="Search"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Filters applied live as they change */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Staff / Executive</label>
              <select
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {staffOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Client Details</label>
              <select
                value={detailsStatus}
                onChange={(e) => setDetailsStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="All Details">All Details</option>
                <option value="Collected">Collected</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={!hasActiveFilters}
                title="Clear all filters"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>✕</span>
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Converted</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">{totalConvertedCount}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Clients</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Details Collected</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-emerald-800">{collectedDetailsCount}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Ready</span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Awaiting Details</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-amber-800">{pendingDetailsCount}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Pending</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Handover Ready</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">
                {totalConvertedCount > 0
                  ? `${Math.round((collectedDetailsCount / totalConvertedCount) * 100)}%`
                  : '0%'}
              </span>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">Coverage</span>
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3">Order No & Date</th>
                  <th className="py-3 px-3">Company & Contact</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Staff / BDM</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Client Details</th>
                  <th className="py-3 px-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading converted clients register…
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No converted client records match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((order, idx) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-semibold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{order.orderNo}</div>
                        <div className="text-[10.5px] text-slate-400">Date: {order.date}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 leading-snug truncate max-w-[200px]" title={order.company}>{order.company}</div>
                        <div className="text-[11px] text-slate-500">
                          {order.customer} • <span className="font-mono">{order.mobile}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-600">
                        {order.location}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{order.staff}</div>
                        <div className="text-[10px] text-slate-400">BDM: {order.bdm}</div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {order.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${getDetailsBadge(
                            order.detailsStatus
                          )}`}
                        >
                          {order.detailsStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                            title="Quick View"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/client-details')}
                            className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 transition cursor-pointer"
                            title="Open Client Details"
                          >
                            Details →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Footer summary */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-800">{filteredData.length}</span>{' '}
              converted clients
            </div>

            <div className="font-mono text-[10px]">PROGRAMERS INTERNATIONAL &bull; REGISTER AUDIT</div>
          </div>
        </div>

        {/* Quick View Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedOrder(null)
            }}
          >
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                    <ClipboardListIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Client Details — {selectedOrder.orderNo}</h3>
                    <p className="text-[11px] text-slate-400">Accepted on {selectedOrder.date}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs text-slate-600">
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client / Company</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedOrder.company}</p>
                  <p className="mt-0.5 text-slate-600">{selectedOrder.customer} • {selectedOrder.mobile}</p>
                  <p className="text-slate-500">{selectedOrder.email} • {selectedOrder.location}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <span className="text-[10px] font-bold text-slate-400">Category & Scope</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedOrder.category}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Lead ID: {selectedOrder.leadId}</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-3">
                    <span className="text-[10px] font-bold text-slate-400">Account Staff</span>
                    <p className="font-semibold text-slate-800 mt-0.5">Exec: {selectedOrder.staff}</p>
                    <p className="text-[11px] text-slate-500 mt-1">BDM: {selectedOrder.bdm}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${getDetailsBadge(selectedOrder.detailsStatus)}`}>
                    Client Details: {selectedOrder.detailsStatus}
                  </span>
                </div>

                {selectedOrder.remarks && (
                  <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700">Remarks: </span>
                    <span className="text-slate-600">{selectedOrder.remarks}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null)
                    navigate('/client-details')
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                >
                  Collect Client Details →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}