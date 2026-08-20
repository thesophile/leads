import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../Layout/Layout'

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

function PrinterIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
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

const INITIAL_CONVERTED_REGISTER = [
  {
    id: 1,
    orderNo: 'ORD-2026-001',
    leadId: 'TC-108',
    date: '12-08-2026',
    rawDate: '2026-08-12',
    company: 'NAMBEESANS LAKSHMI LODGE',
    customer: 'Karthika Nambeesan',
    mobile: '9447151442',
    email: 'bookings@nambeesanslodge.com',
    location: 'Thriprayar',
    staff: 'Bincy',
    bdm: 'Husna',
    category: 'Dynamic Website',
    detailsStatus: 'Collected',
    remarks: 'Order accepted by client. SRS and business card collected.',
  },
  {
    id: 2,
    orderNo: 'ORD-2026-002',
    leadId: 'TC-103',
    date: '11-08-2026',
    rawDate: '2026-08-11',
    company: 'MANZOOR SUPER SPECIALITY HOSPITAL',
    customer: 'Dr. Manzoor Ali',
    mobile: '9447118234',
    email: 'director@manzoorhospital.org',
    location: 'Trivandrum',
    staff: 'Priya Sharma',
    bdm: 'Alex Joseph',
    category: 'Dynamic Web & OPD Suite',
    detailsStatus: 'Pending',
    remarks: 'Order form sent and accepted. Awaiting SRS and business card.',
  },
  {
    id: 3,
    orderNo: 'ORD-2026-003',
    leadId: 'TC-105',
    date: '10-08-2026',
    rawDate: '2026-08-10',
    company: 'ROYAL PALACE CONVENTION CENTRE',
    customer: 'Kabeer Khan',
    mobile: '9567112004',
    email: 'events@royalpalacekerala.com',
    location: 'Thrissur',
    staff: 'Ananya Nair',
    bdm: 'Shanu VR',
    category: 'Dynamic Website',
    detailsStatus: 'Collected',
    remarks: 'Accepted via WhatsApp. Requirements call recorded as voice clip.',
  },
  {
    id: 4,
    orderNo: 'ORD-2026-004',
    leadId: 'TC-102',
    date: '08-08-2026',
    rawDate: '2026-08-08',
    company: 'SHADES.IN LUXURY EYEWEAR',
    customer: 'Rahul Menon',
    mobile: '9845123991',
    email: 'management@shades.in',
    location: 'Kochi',
    staff: 'Alex Joseph',
    bdm: 'Alex Joseph',
    category: 'Meta Ads',
    detailsStatus: 'Collected',
    remarks: 'Campaign brief approved. Business card and ad copy shared.',
  },
  {
    id: 5,
    orderNo: 'ORD-2026-005',
    leadId: 'TC-110',
    date: '05-08-2026',
    rawDate: '2026-08-05',
    company: 'NEW LIFE MATERNITY HOSPITAL',
    customer: 'Dr. Susan Thomas',
    mobile: '8714546783',
    email: 'contact@newlifehospital.org',
    location: 'Kozhikode',
    staff: 'Shanu VR',
    bdm: 'Shanu VR',
    category: 'Mobile App',
    detailsStatus: 'Pending',
    remarks: 'Accepted in principle. SRS document expected from IT team.',
  },
  {
    id: 6,
    orderNo: 'ORD-2026-006',
    leadId: 'TC-115',
    date: '02-08-2026',
    rawDate: '2026-08-02',
    company: 'KERALA SPICES & EXPORTS',
    customer: 'Varghese Mathew',
    mobile: '9446221100',
    email: 'exports@keralaspices.in',
    location: 'Cochin',
    staff: 'Priya Sharma',
    bdm: 'Priya Sharma',
    category: 'SEO & Digital Marketing',
    detailsStatus: 'Collected',
    remarks: 'Order accepted. Keywords list and business card received.',
  },
  {
    id: 7,
    orderNo: 'ORD-2026-007',
    leadId: 'TC-120',
    date: '28-07-2026',
    rawDate: '2026-07-28',
    company: 'CALICUT GOLD & DIAMONDS',
    customer: 'Anoop Chandran',
    mobile: '9847113355',
    email: 'sales@calicutgold.com',
    location: 'Calicut',
    staff: 'NIMISHA DAVIS',
    bdm: 'NIMISHA DAVIS',
    category: 'Static Website',
    detailsStatus: 'Collected',
    remarks: 'Client accepted. Content and images handed over.',
  },
  {
    id: 8,
    orderNo: 'ORD-2026-008',
    leadId: 'TC-124',
    date: '25-07-2026',
    rawDate: '2026-07-25',
    company: 'GREEN VALLEY RESORTS & SPA',
    customer: 'Harikrishnan R',
    mobile: '9744118822',
    email: 'info@greenvalleyresorts.com',
    location: 'Munnar',
    staff: 'Husna',
    bdm: 'Husna',
    category: 'Google Ads',
    detailsStatus: 'Pending',
    remarks: 'Accepted over call. Waiting for signed order form and brief.',
  },
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

const STAFF_LIST = [
  'All Staff',
  'Bincy',
  'Priya Sharma',
  'Ananya Nair',
  'Alex Joseph',
  'Shanu VR',
  'NIMISHA DAVIS',
  'Husna',
  'Malavika',
  'Karthika',
]

const DETAILS_STATUS_LIST = [
  'All Details',
  'Collected',
  'Pending',
]

export default function OrderReceived() {
  const navigate = useNavigate()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('All Category')
  const [staff, setStaff] = useState('All Staff')
  const [detailsStatus, setDetailsStatus] = useState('All Details')
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedOrder, setSelectedOrder] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    category: 'All Category',
    staff: 'All Staff',
    detailsStatus: 'All Details',
  })

  function handleApplyFilter(e) {
    e.preventDefault()
    setAppliedFilters({
      fromDate,
      toDate,
      category,
      staff,
      detailsStatus,
    })
    setCurrentPage(1)
  }

  function handleResetFilters() {
    setFromDate('')
    setToDate('')
    setCategory('All Category')
    setStaff('All Staff')
    setDetailsStatus('All Details')
    setSearchQuery('')
    setAppliedFilters({
      fromDate: '',
      toDate: '',
      category: 'All Category',
      staff: 'All Staff',
      detailsStatus: 'All Details',
    })
    setCurrentPage(1)
  }

  const filteredData = useMemo(() => {
    return INITIAL_CONVERTED_REGISTER.filter((item) => {
      if (appliedFilters.fromDate && item.rawDate < appliedFilters.fromDate) return false
      if (appliedFilters.toDate && item.rawDate > appliedFilters.toDate) return false
      if (appliedFilters.category !== 'All Category' && item.category !== appliedFilters.category) return false
      if (appliedFilters.staff !== 'All Staff' && item.staff !== appliedFilters.staff) return false
      if (appliedFilters.detailsStatus !== 'All Details' && item.detailsStatus !== appliedFilters.detailsStatus) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.orderNo.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q) ||
          item.mobile.includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.staff.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [appliedFilters, searchQuery])

  const totalConvertedCount = filteredData.length
  const pendingDetailsCount = filteredData.filter((i) => i.detailsStatus === 'Pending').length
  const collectedDetailsCount = filteredData.filter((i) => i.detailsStatus === 'Collected').length

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

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
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer active:scale-95"
                title="Export as CSV"
              >
                <DownloadIcon />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-95"
              >
                <PrinterIcon />
                <span>Print Register</span>
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

          {/* Filter Form */}
          <form onSubmit={handleApplyFilter} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6 items-end">
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
                {CATEGORIES.map((c) => (
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
                {STAFF_LIST.map((s) => (
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
                {DETAILS_STATUS_LIST.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-95"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                title="Reset Filters"
              >
                Reset
              </button>
            </div>
          </form>
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
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No converted client records match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((order, idx) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-semibold text-slate-400">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
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
              <span className="font-semibold text-slate-800">
                {filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * itemsPerPage, filteredData.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{filteredData.length}</span> converted clients
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`min-w-[28px] rounded-lg px-2 py-1 text-xs font-semibold transition cursor-pointer ${
                    currentPage === pg
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Quick View Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
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