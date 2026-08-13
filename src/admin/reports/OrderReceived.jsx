import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../Layout/Layout'

const INITIAL_ORDERS_REGISTER = [
  {
    id: 1,
    orderNo: 'ORD-2026-001',
    leadId: 'TC-108',
    date: '12-08-2026',
    rawDate: '2026-08-12',
    deliveryDate: '25-08-2026',
    company: 'NAMBEESANS LAKSHMI LODGE',
    customer: 'Karthika Nambeesan',
    mobile: '9447151442',
    email: 'bookings@nambeesanslodge.com',
    location: 'Thriprayar',
    staff: 'Bincy',
    bdm: 'Husna',
    category: 'Dynamic Website',
    totalAmount: 50000,
    discount: 5000,
    netAmount: 45000,
    advancePaid: 25000,
    balanceDue: 20000,
    paymentMode: 'UPI / Bank Transfer',
    bank: 'ICICI Bank',
    status: 'In Progress',
    remarks: '50% advance realized via UPI. Frontend UI layout and room gallery in development.',
  },
  {
    id: 2,
    orderNo: 'ORD-2026-002',
    leadId: 'TC-103',
    date: '11-08-2026',
    rawDate: '2026-08-11',
    deliveryDate: '30-08-2026',
    company: 'MANZOOR SUPER SPECIALITY HOSPITAL',
    customer: 'Dr. Manzoor Ali',
    mobile: '9447118234',
    email: 'director@manzoorhospital.org',
    location: 'Trivandrum',
    staff: 'Priya Sharma',
    bdm: 'Alex Joseph',
    category: 'Dynamic Web & OPD Suite',
    totalAmount: 145000,
    discount: 10000,
    netAmount: 135000,
    advancePaid: 70000,
    balanceDue: 65000,
    paymentMode: 'RTGS',
    bank: 'ICICI Bank',
    status: 'In Progress',
    remarks: 'Doctor OPD desk module and appointment scheduling integrated. Testing underway.',
  },
  {
    id: 3,
    orderNo: 'ORD-2026-003',
    leadId: 'TC-105',
    date: '10-08-2026',
    rawDate: '2026-08-10',
    deliveryDate: '22-08-2026',
    company: 'ROYAL PALACE CONVENTION CENTRE',
    customer: 'Kabeer Khan',
    mobile: '9567112004',
    email: 'events@royalpalacekerala.com',
    location: 'Thrissur',
    staff: 'Ananya Nair',
    bdm: 'Shanu VR',
    category: 'Dynamic Website',
    totalAmount: 95000,
    discount: 5000,
    netAmount: 90000,
    advancePaid: 45000,
    balanceDue: 45000,
    paymentMode: 'NEFT',
    bank: 'ICICI Bank',
    status: 'In Progress',
    remarks: 'Online banquet hall reservation calendar engine setup.',
  },
  {
    id: 4,
    orderNo: 'ORD-2026-004',
    leadId: 'TC-102',
    date: '08-08-2026',
    rawDate: '2026-08-08',
    deliveryDate: '15-08-2026',
    company: 'SHADES.IN LUXURY EYEWEAR',
    customer: 'Rahul Menon',
    mobile: '9845123991',
    email: 'management@shades.in',
    location: 'Kochi',
    staff: 'Alex Joseph',
    bdm: 'Alex Joseph',
    category: 'Meta Ads',
    totalAmount: 55000,
    discount: 8000,
    netAmount: 47000,
    advancePaid: 47000,
    balanceDue: 0,
    paymentMode: 'Card Payment',
    bank: 'ICICI Bank',
    status: 'Completed',
    remarks: 'Omnichannel Meta Ads & pixel conversion tracking active. 100% payment settled.',
  },
  {
    id: 5,
    orderNo: 'ORD-2026-005',
    leadId: 'TC-110',
    date: '05-08-2026',
    rawDate: '2026-08-05',
    deliveryDate: '18-08-2026',
    company: 'NEW LIFE MATERNITY HOSPITAL',
    customer: 'Dr. Susan Thomas',
    mobile: '8714546783',
    email: 'contact@newlifehospital.org',
    location: 'Kozhikode',
    staff: 'Shanu VR',
    bdm: 'Shanu VR',
    category: 'Mobile App',
    totalAmount: 180000,
    discount: 15000,
    netAmount: 165000,
    advancePaid: 80000,
    balanceDue: 85000,
    paymentMode: 'Cheque Deposit',
    bank: 'HDFC Bank',
    status: 'In Progress',
    remarks: 'iOS and Android patient portal app build phase 1 completed.',
  },
  {
    id: 6,
    orderNo: 'ORD-2026-006',
    leadId: 'TC-115',
    date: '02-08-2026',
    rawDate: '2026-08-02',
    deliveryDate: '10-08-2026',
    company: 'KERALA SPICES & EXPORTS',
    customer: 'Varghese Mathew',
    mobile: '9446221100',
    email: 'exports@keralaspices.in',
    location: 'Cochin',
    staff: 'Priya Sharma',
    bdm: 'Priya Sharma',
    category: 'SEO & Digital Marketing',
    totalAmount: 60000,
    discount: 5000,
    netAmount: 55000,
    advancePaid: 55000,
    balanceDue: 0,
    paymentMode: 'Bank Transfer',
    bank: 'State Bank of India',
    status: 'Completed',
    remarks: 'International export SEO keywords ranking top 3 on Google.',
  },
  {
    id: 7,
    orderNo: 'ORD-2026-007',
    leadId: 'TC-120',
    date: '28-07-2026',
    rawDate: '2026-07-28',
    deliveryDate: '12-08-2026',
    company: 'CALICUT GOLD & DIAMONDS',
    customer: 'Anoop Chandran',
    mobile: '9847113355',
    email: 'sales@calicutgold.com',
    location: 'Calicut',
    staff: 'NIMISHA DAVIS',
    bdm: 'NIMISHA DAVIS',
    category: 'Static Website',
    totalAmount: 35000,
    discount: 3000,
    netAmount: 32000,
    advancePaid: 32000,
    balanceDue: 0,
    paymentMode: 'UPI',
    bank: 'ICICI Bank',
    status: 'Delivered',
    remarks: 'Static corporate showroom portal delivered & SSL certificate installed.',
  },
  {
    id: 8,
    orderNo: 'ORD-2026-008',
    leadId: 'TC-124',
    date: '25-07-2026',
    rawDate: '2026-07-25',
    deliveryDate: '05-08-2026',
    company: 'GREEN VALLEY RESORTS & SPA',
    customer: 'Harikrishnan R',
    mobile: '9744118822',
    email: 'info@greenvalleyresorts.com',
    location: 'Munnar',
    staff: 'Husna',
    bdm: 'Husna',
    category: 'Google Ads',
    totalAmount: 40000,
    discount: 2000,
    netAmount: 38000,
    advancePaid: 38000,
    balanceDue: 0,
    paymentMode: 'Net Banking',
    bank: 'Federal Bank',
    status: 'Completed',
    remarks: 'Monsoon travel PPC search ads package successfully concluded.',
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

const STATUS_LIST = [
  'All Status',
  'Order Created',
  'In Progress',
  'Delivered',
  'Completed',
]

const LOCATIONS = [
  'Location',
  'All Locations',
  'Thriprayar',
  'Trivandrum',
  'Thrissur',
  'Kochi',
  'Kozhikode',
  'Cochin',
  'Calicut',
  'Munnar',
  'Chalakudy',
  'Palakkad',
]

export default function OrderReceived() {
  const navigate = useNavigate()

  // Filter form states
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('All Category')
  const [staff, setStaff] = useState('All Staff')
  const [status, setStatus] = useState('All Status')
  const [location, setLocation] = useState('Location')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected Order for quick details modal
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    category: 'All Category',
    staff: 'All Staff',
    status: 'All Status',
    location: 'Location',
  })

  function handleApplyFilter(e) {
    e.preventDefault()
    setAppliedFilters({
      fromDate,
      toDate,
      category,
      staff,
      status,
      location,
    })
    setCurrentPage(1)
  }

  function handleResetFilters() {
    setFromDate('')
    setToDate('')
    setCategory('All Category')
    setStaff('All Staff')
    setStatus('All Status')
    setLocation('Location')
    setSearchQuery('')
    setAppliedFilters({
      fromDate: '',
      toDate: '',
      category: 'All Category',
      staff: 'All Staff',
      status: 'All Status',
      location: 'Location',
    })
    setCurrentPage(1)
  }

  // Filtered dataset
  const filteredData = useMemo(() => {
    return INITIAL_ORDERS_REGISTER.filter((item) => {
      if (appliedFilters.fromDate && item.rawDate < appliedFilters.fromDate) return false
      if (appliedFilters.toDate && item.rawDate > appliedFilters.toDate) return false
      if (appliedFilters.category !== 'All Category' && item.category !== appliedFilters.category) return false
      if (appliedFilters.staff !== 'All Staff' && item.staff !== appliedFilters.staff) return false
      if (appliedFilters.status !== 'All Status' && item.status !== appliedFilters.status) return false
      if (
        appliedFilters.location !== 'Location' &&
        appliedFilters.location !== 'All Locations' &&
        item.location.toLowerCase() !== appliedFilters.location.toLowerCase()
      ) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.orderNo.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q) ||
          item.mobile.includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.staff.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [appliedFilters, searchQuery])

  // Summary Metrics calculations
  const totalOrdersCount = filteredData.length
  const totalBookedValue = filteredData.reduce((acc, curr) => acc + curr.netAmount, 0)
  const totalAdvanceCollected = filteredData.reduce((acc, curr) => acc + curr.advancePaid, 0)
  const totalOutstanding = filteredData.reduce((acc, curr) => acc + curr.balanceDue, 0)
  const completedCount = filteredData.filter((i) => i.status === 'Completed' || i.status === 'Delivered').length

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  // Export to CSV
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
      'Total Amount',
      'Discount',
      'Net Amount',
      'Advance Paid',
      'Balance Due',
      'Status',
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
      o.totalAmount,
      o.discount,
      o.netAmount,
      o.advancePaid,
      o.balanceDue,
      `"${o.status}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Order_Received_Register_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getStatusBadge(st) {
    switch (st) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Delivered':
        return 'bg-teal-50 text-teal-700 border-teal-200'
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Order Created':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Printable Official Header */}
        <div className="hidden print:block border-b pb-4 mb-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">LEADS PROCRM — ORDER RECEIVED REGISTER</h1>
            <p className="text-xs text-slate-500">Official Order Booking Ledger & Payment Realization Summary</p>
            <p className="text-[10px] text-slate-400 mt-1">Generated on: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Top Header & Filter Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs print:hidden">
          {/* Top Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5 text-slate-800 font-bold text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-black">
                📦
              </span>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Order Received Register</h1>
                <p className="text-[11px] font-normal text-slate-500">Comprehensive log of confirmed client bookings, billings and advances</p>
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
                <span>📥</span>
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-95"
              >
                <span>🖨</span>
                <span>Print Ledger</span>
              </button>

              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search orders..."
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
          <form onSubmit={handleApplyFilter} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-7 items-end">
            {/* From Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Category */}
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

            {/* Staff */}
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

            {/* Status */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Order Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter & Reset Buttons */}
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 print:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Bookings</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">{totalOrdersCount}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Orders</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Booked Value</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">₹{totalBookedValue.toLocaleString()}</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">Net Gross</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Advance Realized</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-emerald-800">₹{totalAdvanceCollected.toLocaleString()}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                {totalBookedValue > 0 ? `${Math.round((totalAdvanceCollected / totalBookedValue) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Outstanding Balance</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-amber-800">₹{totalOutstanding.toLocaleString()}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Pending</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivered / Done</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">{completedCount}</span>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">Completed</span>
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
                  <th className="py-3 px-3 text-right">Net Value</th>
                  <th className="py-3 px-3 text-right">Advance Paid</th>
                  <th className="py-3 px-3 text-right">Balance Due</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No order records match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((order, idx) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Sl. No */}
                      <td className="py-3 px-3 text-center font-semibold text-slate-400">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>

                      {/* Order No & Date */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{order.orderNo}</div>
                        <div className="text-[10.5px] text-slate-400">Date: {order.date}</div>
                      </td>

                      {/* Company & Contact */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 leading-snug">{order.company}</div>
                        <div className="text-[11px] text-slate-500">
                          {order.customer} • <span className="font-mono">{order.mobile}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-600">
                        {order.location}
                      </td>

                      {/* Staff */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{order.staff}</div>
                        <div className="text-[10px] text-slate-400">BDM: {order.bdm}</div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {order.category}
                        </span>
                      </td>

                      {/* Net Value */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{order.netAmount.toLocaleString()}
                      </td>

                      {/* Advance Paid */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        ₹{order.advancePaid.toLocaleString()}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                        {order.balanceDue > 0 ? (
                          <span className="text-amber-700">₹{order.balanceDue.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">₹0 (Paid)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Action */}
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
                            onClick={() => navigate(`/orders/preview/${order.orderNo}`)}
                            className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 transition cursor-pointer"
                            title="Open Order Form"
                          >
                            Form →
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
              of <span className="font-semibold text-slate-800">{filteredData.length}</span> orders
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

        {/* Quick View Drawer Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                    📋
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Order Details — {selectedOrder.orderNo}</h3>
                    <p className="text-[11px] text-slate-400">Booked on {selectedOrder.date}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  ✕
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
                    <p className="text-[11px] text-slate-500 mt-1">Delivery Target: {selectedOrder.deliveryDate}</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-3">
                    <span className="text-[10px] font-bold text-slate-400">Account Staff</span>
                    <p className="font-semibold text-slate-800 mt-0.5">Exec: {selectedOrder.staff}</p>
                    <p className="text-[11px] text-slate-500 mt-1">BDM: {selectedOrder.bdm}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Financial Summary</span>
                  <div className="mt-2 space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span>Total Value:</span>
                      <span className="font-mono">₹{selectedOrder.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Discount Given:</span>
                      <span className="font-mono">-₹{selectedOrder.discount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-emerald-200/60 pt-1">
                      <span>Net Agreement Amount:</span>
                      <span className="font-mono">₹{selectedOrder.netAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-emerald-700">
                      <span>Advance Received ({selectedOrder.paymentMode}):</span>
                      <span className="font-mono">₹{selectedOrder.advancePaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-700 border-t border-emerald-200/60 pt-1">
                      <span>Balance Outstanding:</span>
                      <span className="font-mono">₹{selectedOrder.balanceDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.remarks && (
                  <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700">Execution Remarks: </span>
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
                    const orderId = selectedOrder.orderNo
                    setSelectedOrder(null)
                    navigate(`/orders/preview/${orderId}`)
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                >
                  Open Full Order Form →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
