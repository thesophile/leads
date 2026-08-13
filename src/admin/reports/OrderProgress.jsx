import { useState, useMemo } from 'react'
import Layout from '../../Layout/Layout'

const INITIAL_PROGRESS_DATA = [
  {
    id: 1,
    orderNo: 'ORD-2026-001',
    company: 'NAMBEESANS LAKSHMI LODGE',
    customer: 'Karthika Nambeesan',
    category: 'Dynamic Website',
    date: '12-08-2026',
    rawDate: '2026-08-12',
    deliveryDate: '25-08-2026',
    staff: 'Bincy',
    developer: 'Sujith Kumar',
    stage: 'UI/UX Design',
    health: 'On Time',
    daysRemaining: 12,
    remarks: 'Mockups sent for approval. Client feedback on color palette is pending.',
  },
  {
    id: 2,
    orderNo: 'ORD-2026-002',
    company: 'MANZOOR SUPER SPECIALITY HOSPITAL',
    customer: 'Dr. Manzoor Ali',
    category: 'Dynamic Web & OPD Suite',
    date: '11-08-2026',
    rawDate: '2026-08-11',
    deliveryDate: '30-08-2026',
    staff: 'Priya Sharma',
    developer: 'Rahul Varma',
    stage: 'Coding & Development',
    health: 'On Time',
    daysRemaining: 17,
    remarks: 'OPD appointment scheduling database structure finalized. Integrating APIs.',
  },
  {
    id: 3,
    orderNo: 'ORD-2026-003',
    company: 'ROYAL PALACE CONVENTION CENTRE',
    customer: 'Kabeer Khan',
    category: 'Dynamic Website',
    date: '10-08-2026',
    rawDate: '2026-08-10',
    deliveryDate: '22-08-2026',
    staff: 'Ananya Nair',
    developer: 'Arya Sree',
    stage: 'UI/UX Design',
    health: 'On Time',
    daysRemaining: 9,
    remarks: 'Banquet hall online booking calendar grid layout finalized.',
  },
  {
    id: 4,
    orderNo: 'ORD-2026-004',
    company: 'SHADES.IN LUXURY EYEWEAR',
    customer: 'Rahul Menon',
    category: 'Meta Ads',
    date: '08-08-2026',
    rawDate: '2026-08-08',
    deliveryDate: '15-08-2026',
    staff: 'Alex Joseph',
    developer: 'Sandeep MD',
    stage: 'Testing & QA',
    health: 'On Time',
    daysRemaining: 2,
    remarks: 'Meta Pixel CAPI setup complete. Final testing of purchase event fires.',
  },
  {
    id: 5,
    orderNo: 'ORD-2026-005',
    company: 'NEW LIFE MATERNITY HOSPITAL',
    customer: 'Dr. Susan Thomas',
    category: 'Mobile App',
    date: '05-08-2026',
    rawDate: '2026-08-05',
    deliveryDate: '18-08-2026',
    staff: 'Shanu VR',
    developer: 'Sujith Kumar',
    stage: 'Coding & Development',
    health: 'Delayed',
    daysRemaining: -5,
    remarks: 'Delay in receiving patient EHR integration documents from client side.',
  },
  {
    id: 6,
    orderNo: 'ORD-2026-006',
    company: 'KERALA SPICES & EXPORTS',
    customer: 'Varghese Mathew',
    category: 'SEO & Digital Marketing',
    date: '02-08-2026',
    rawDate: '2026-08-02',
    deliveryDate: '10-08-2026',
    staff: 'Priya Sharma',
    developer: 'Deepak Raj',
    stage: 'Live & Deployed',
    health: 'Completed',
    daysRemaining: 0,
    remarks: 'SEO campaigns live. Keyword tracking configurations delivered to client dashboard.',
  },
  {
    id: 7,
    orderNo: 'ORD-2026-007',
    company: 'CALICUT GOLD & DIAMONDS',
    customer: 'Anoop Chandran',
    category: 'Static Website',
    date: '28-07-2026',
    rawDate: '2026-07-28',
    deliveryDate: '12-08-2026',
    staff: 'NIMISHA DAVIS',
    developer: 'Arya Sree',
    stage: 'Live & Deployed',
    health: 'Completed',
    daysRemaining: 0,
    remarks: 'Static catalogue web pages loaded. Hosted on AWS CloudFront S3.',
  },
  {
    id: 8,
    orderNo: 'ORD-2026-008',
    company: 'GREEN VALLEY RESORTS & SPA',
    customer: 'Harikrishnan R',
    category: 'Google Ads',
    date: '25-07-2026',
    rawDate: '2026-07-25',
    deliveryDate: '05-08-2026',
    staff: 'Husna',
    developer: 'Sandeep MD',
    stage: 'Live & Deployed',
    health: 'Completed',
    daysRemaining: 0,
    remarks: 'Google booking search ads executed successfully for dynamic search campaigns.',
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

const DEVELOPERS = [
  'All Developers',
  'Sujith Kumar',
  'Rahul Varma',
  'Arya Sree',
  'Sandeep MD',
  'Deepak Raj',
]

const STAGES = [
  'All Stages',
  'UI/UX Design',
  'Coding & Development',
  'Testing & QA',
  'Client Review',
  'Live & Deployed',
]

const HEALTH_STATUS = [
  'All Health',
  'On Time',
  'Delayed',
  'Completed',
]

function ClipboardIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  )
}

function DownloadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function PrinterIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function SearchIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CloseIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CalendarIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function OrderProgress() {
  const [category, setCategory] = useState('All Category')
  const [developer, setDeveloper] = useState('All Developers')
  const [stage, setStage] = useState('All Stages')
  const [health, setHealth] = useState('All Health')
  const [searchQuery, setSearchQuery] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [appliedFilters, setAppliedFilters] = useState({
    category: 'All Category',
    developer: 'All Developers',
    stage: 'All Stages',
    health: 'All Health',
  })

  const [selectedProject, setSelectedProject] = useState(null)

  function handleApplyFilter(e) {
    e.preventDefault()
    setAppliedFilters({
      category,
      developer,
      stage,
      health,
    })
    setCurrentPage(1)
  }

  function handleResetFilters() {
    setCategory('All Category')
    setDeveloper('All Developers')
    setStage('All Stages')
    setHealth('All Health')
    setSearchQuery('')
    setAppliedFilters({
      category: 'All Category',
      developer: 'All Developers',
      stage: 'All Stages',
      health: 'All Health',
    })
    setCurrentPage(1)
  }

  const filteredData = useMemo(() => {
    return INITIAL_PROGRESS_DATA.filter((item) => {
      if (appliedFilters.category !== 'All Category' && item.category !== appliedFilters.category) return false
      if (appliedFilters.developer !== 'All Developers' && item.developer !== appliedFilters.developer) return false
      if (appliedFilters.stage !== 'All Stages' && item.stage !== appliedFilters.stage) return false
      if (appliedFilters.health !== 'All Health' && item.health !== appliedFilters.health) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.orderNo.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.customer.toLowerCase().includes(q) ||
          item.developer.toLowerCase().includes(q) ||
          item.stage.toLowerCase().includes(q) ||
          item.health.toLowerCase().includes(q) ||
          item.staff.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [appliedFilters, searchQuery])

  const totalProjects = filteredData.length
  const activeCount = filteredData.filter((i) => i.health !== 'Completed').length
  const completedCount = filteredData.filter((i) => i.health === 'Completed').length
  const delayedCount = filteredData.filter((i) => i.health === 'Delayed').length
  const onTimeCount = filteredData.filter((i) => i.health === 'On Time').length

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  function handleExportCSV() {
    const headers = [
      'Sl No',
      'Order ID',
      'Date',
      'Target Date',
      'Company Name',
      'Customer',
      'Technical Staff',
      'Development Stage',
      'Delivery Health',
      'Days Remaining',
      'Remarks',
    ]

    const rows = filteredData.map((p, idx) => [
      idx + 1,
      `"${p.orderNo}"`,
      `"${p.date}"`,
      `"${p.deliveryDate}"`,
      `"${p.company}"`,
      `"${p.customer}"`,
      `"${p.developer}"`,
      `"${p.stage}"`,
      `"${p.health}"`,
      p.daysRemaining,
      `"${p.remarks}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Order_Progress_Register_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getHealthBadge(hlth) {
    switch (hlth) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'On Time':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Delayed':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  function getHealthDot(hlth) {
    switch (hlth) {
      case 'Completed':
        return 'bg-emerald-500'
      case 'On Time':
        return 'bg-blue-500'
      case 'Delayed':
        return 'bg-rose-500'
      default:
        return 'bg-slate-400'
    }
  }

  function getStageBadge(stg) {
    switch (stg) {
      case 'UI/UX Design':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Coding & Development':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'Testing & QA':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Client Review':
        return 'bg-sky-50 text-sky-700 border-sky-200'
      case 'Live & Deployed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <Layout>
      <div className="space-y-5">
        {/* Printable Official Header */}
        <div className="hidden print:block border-b pb-4 mb-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">LEADS PROCRM — ORDER PROGRESS REGISTER</h1>
            <p className="text-xs text-slate-500">Project Delivery Milestones & Operational Health Summary</p>
            <p className="text-[10px] text-slate-400 mt-1">Generated on: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Header & Filters Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <ClipboardIcon className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Order Progress Register</h1>
                <p className="text-[11px] font-normal text-slate-500">Delivery milestones, developer assignments and project health</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-l-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-48"
                />
                <button
                  type="button"
                  onClick={() => {}}
                  className="flex items-center justify-center rounded-r-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700 transition cursor-pointer"
                  title="Search"
                >
                  <SearchIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                title="Export as CSV"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition cursor-pointer"
              >
                <PrinterIcon className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleApplyFilter} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Developer / Tech Staff</label>
              <select value={developer} onChange={(e) => setDeveloper(e.target.value)} className={inputClass}>
                {DEVELOPERS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Development Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Delivery Health</label>
              <select value={health} onChange={(e) => setHealth(e.target.value)} className={inputClass}>
                {HEALTH_STATUS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-brand-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition cursor-pointer"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Operational Statistics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 print:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Projects</span>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{totalProjects}</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">On Track</span>
            <p className="mt-1.5 text-2xl font-bold text-blue-800">{onTimeCount}</p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Delayed</span>
            <p className="mt-1.5 text-2xl font-bold text-rose-800">{delayedCount}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Completed</span>
            <p className="mt-1.5 text-2xl font-bold text-emerald-800">{completedCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">In Delivery</span>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{activeCount}</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500">
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Order</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Company & Client</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Team</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Stage</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Delivery</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Health</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No project progress records match the filters.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{project.orderNo}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{project.category}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 leading-snug">{project.company}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{project.customer}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{project.developer}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{project.staff}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${getStageBadge(
                            project.stage
                          )}`}
                        >
                          {project.stage}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                          <CalendarIcon className="h-3 w-3 text-slate-400" />
                          {project.deliveryDate}
                        </div>
                        <div className="text-[10px] mt-0.5">
                          {project.health === 'Completed' ? (
                            <span className="font-semibold text-emerald-600">Delivered</span>
                          ) : project.daysRemaining >= 0 ? (
                            <span className="text-slate-400">{project.daysRemaining} days left</span>
                          ) : (
                            <span className="font-bold text-rose-600">{Math.abs(project.daysRemaining)} days overdue</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${getHealthBadge(
                            project.health
                          )}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${getHealthDot(project.health)}`} />
                          {project.health}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap print:hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedProject(project)}
                          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
              of <span className="font-semibold text-slate-800">{filteredData.length}</span> projects
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
                      ? 'bg-brand-600 text-white'
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

        {/* Milestone Detail Modal */}
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <ClipboardIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Project Delivery Details</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedProject.orderNo}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  aria-label="Close details"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4 text-xs text-slate-600">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedProject.company}</p>
                  <p className="mt-0.5 text-slate-600">{selectedProject.customer}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-block rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {selectedProject.category}
                    </span>
                    <span className="inline-block rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      Booked: {selectedProject.date}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Developer</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedProject.developer}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Fulfillment Team</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Executive</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedProject.staff}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Account Owner</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-3.5 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Milestone</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${getStageBadge(selectedProject.stage)}`}>
                      {selectedProject.stage}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${getHealthBadge(selectedProject.health)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getHealthDot(selectedProject.health)}`} />
                      {selectedProject.health}
                    </span>
                  </div>
                  <p className="text-slate-500">
                    Target delivery:{' '}
                    <span className="font-mono font-semibold text-slate-800">{selectedProject.deliveryDate}</span>
                    {selectedProject.health === 'Completed' ? (
                      <span className="text-emerald-700 font-semibold"> • Delivered on schedule</span>
                    ) : selectedProject.daysRemaining >= 0 ? (
                      <span> • {selectedProject.daysRemaining} days remaining</span>
                    ) : (
                      <span className="text-rose-700 font-semibold"> • {Math.abs(selectedProject.daysRemaining)} days overdue</span>
                    )}
                  </p>
                </div>

                {selectedProject.remarks && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Development Remarks</p>
                    <p className="text-slate-600 leading-relaxed">{selectedProject.remarks}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}