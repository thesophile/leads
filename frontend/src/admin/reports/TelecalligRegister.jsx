import { useEffect, useMemo, useState } from 'react'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'

const INITIAL_TELECALLING_REGISTER = [
  { id: 1, date: '10-08-2026', rawDate: '2026-08-10', lastCalledDate: '11-08-2026', company: 'N K BALAKRISHNAN MEMORIAL HOSPITAL', number: '4672284102', location: 'KSGD', staff: 'Malavika', category: 'Hospital', status: 'Not Interested' },
  { id: 2, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'SOFAART FURNITURE', number: '6235270770', location: 'KSGD', staff: 'Malavika', category: 'Furniture', status: 'Not Interested' },
  { id: 3, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'TAMAM FURNITURES & INTERIORS', number: '9895843554', location: 'KSGD', staff: 'Malavika', category: 'Furniture', status: 'Not Interested' },
  { id: 4, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'BHARATH GLASS', number: '9567120090', location: 'KSGD', staff: 'Malavika', category: 'Glass', status: 'Not Interested' },
  { id: 5, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'JAYALAKSHMI FURNITURE & HOME APPLIANCES', number: '9947500678', location: 'KSGD', staff: 'Malavika', category: 'Furniture', status: 'Not Interested' },
  { id: 6, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'ROYAL DECOR FURNITURE & INTERIORS SHOWROOM', number: '9447067217', location: 'KSGD', staff: 'Malavika', category: 'Furniture', status: 'Not Interested' },
  { id: 7, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: "ROOT'S THE FAMILY SALON", number: '9700744357', location: 'KSGD', staff: 'Malavika', category: 'Salon', status: 'Called' },
  { id: 8, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'HANUSREE PERMANENT MAKEUP & ACADEMY', number: '9550851892', location: 'KSGD', staff: 'Malavika', category: 'Beauty Parlour', status: 'Not Interested' },
  { id: 9, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'ANV UNISEX SALON', number: '9182034960', location: 'KSGD', staff: 'Malavika', category: 'Salon', status: 'Called' },
  { id: 10, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'STAR UNISEX SALON | UPPAL', number: '7998044445', location: 'KSGD', staff: 'Malavika', category: 'Salon', status: 'Not Interested' },
  { id: 11, date: '11-08-2026', rawDate: '2026-08-11', lastCalledDate: '12-08-2026', company: 'MANZOOR SUPER SPECIALITY HOSPITAL', number: '9447118234', location: 'TRIVANDRUM', staff: 'Priya Sharma', category: 'Hospital', status: 'Quotation Requested' },
  { id: 12, date: '09-08-2026', rawDate: '2026-08-09', lastCalledDate: '11-08-2026', company: 'ROYAL PALACE CONVENTION CENTRE', number: '9567112004', location: 'THRISSUR', staff: 'Ananya Nair', category: 'Resort', status: 'Quotation Requested' },
  { id: 13, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'NAMBEESANS LAKSHMI LODGE', number: '9447151442', location: 'THRISSUR', staff: 'Bincy', category: 'Resort', status: 'Follow Up' },
  { id: 14, date: '07-08-2026', rawDate: '2026-08-07', lastCalledDate: '09-08-2026', company: 'SHADES.IN LUXURY EYEWEAR', number: '9845123991', location: 'ERNAKULAM', staff: 'Alex Joseph', category: 'Boutique', status: 'Converted' },
]

const STAFF_LIST = ['All Staff', 'Malavika', 'Husna', 'Bincy', 'Alex Joseph', 'Priya Sharma', 'NIMISHA DAVIS', 'Ananya Nair', 'Shanu VR']
const STATUS_LIST = ['All Status', 'Called', 'Not Interested', 'Quotation Requested', 'Follow Up', 'Converted', 'Wrong Number']
const LOCATIONS = ['All Locations', 'KSGD', 'ALLEPPEY', 'THRISSUR', 'ERNAKULAM', 'KOZHIKODE', 'TRIVANDRUM', 'PALAKKAD']

export default function TelecalligRegister() {
  const [categoryOptions, setCategoryOptions] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('All Category')
  const [staff, setStaff] = useState('All Staff')
  const [status, setStatus] = useState('All Status')
  const [location, setLocation] = useState('All Locations')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchCategories() {
      try {
        const data = await api.get('/master/categories/')
        if (!cancelled) setCategoryOptions(data)
      } catch {
        // Report filters can fall back to an empty category list.
      }
    }

    fetchCategories()
    return () => {
      cancelled = true
    }
  }, [])

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Applied Filter State
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    category: 'All Category',
    staff: 'All Staff',
    status: 'All Status',
    location: 'All Locations',
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

  // Filtered Data
  const filteredData = useMemo(() => {
    return INITIAL_TELECALLING_REGISTER.filter((item) => {
      if (appliedFilters.fromDate && item.rawDate < appliedFilters.fromDate) return false
      if (appliedFilters.toDate && item.rawDate > appliedFilters.toDate) return false
      if (appliedFilters.category !== 'All Category' && item.category !== appliedFilters.category) return false
      if (appliedFilters.staff !== 'All Staff' && item.staff !== appliedFilters.staff) return false
      if (appliedFilters.status !== 'All Status' && item.status !== appliedFilters.status) return false
      if (appliedFilters.location !== 'All Locations' && item.location !== appliedFilters.location) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.company.toLowerCase().includes(q) ||
          item.number.includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.staff.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [appliedFilters, searchQuery])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header & Filter Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
          {/* Top Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                ▦
              </span>
              <span>Telecalling Register</span>
            </div>

            {/* Right: Print Button + Search Box */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer active:scale-95"
              >
                <span>🖨</span>
                <span>Print</span>
              </button>

              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-l-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-48"
                />
                <button
                  type="button"
                  onClick={() => {}}
                  className="rounded-r-lg bg-rose-600 px-3 py-2 text-white hover:bg-rose-700 transition flex items-center justify-center cursor-pointer"
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

          {/* Filter Form with 6 inputs + Apply Filter Button */}
          <form onSubmit={handleApplyFilter} className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-7 items-end">
            {/* From Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                <option value="All Category">All Category</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Staff
              </label>
              <select
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
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
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
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
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Apply Filter Button */}
            <div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer active:scale-95"
              >
                <span>☩</span>
                <span>Apply Filter</span>
              </button>
            </div>
          </form>
        </div>

        {/* Printable Official Register Header */}
        <div className="hidden print:block mb-4 border-b-2 border-black pb-3 text-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/programers-logo-BLACCK.png" alt="Programers" className="h-8 w-auto object-contain" />
              <div>
                <h2 className="text-base font-black tracking-wide uppercase">Programers International</h2>
                <p className="text-[9px] text-slate-600">4th Floor, Park House, Round North, Thrissur, Kerala</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-sm font-black uppercase tracking-wider">Telecalling Register</h1>
              <p className="text-[9px] text-slate-600 font-mono">
                Printed: {new Date().toLocaleDateString('en-GB')} | Records: {filteredData.length}
              </p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-[9px] bg-slate-100 p-1.5 rounded border border-slate-300 font-medium">
            <span><strong>Category:</strong> {appliedFilters.category}</span>
            <span>&bull;</span>
            <span><strong>Staff:</strong> {appliedFilters.staff}</span>
            <span>&bull;</span>
            <span><strong>Status:</strong> {appliedFilters.status}</span>
            <span>&bull;</span>
            <span><strong>Location:</strong> {appliedFilters.location}</span>
          </div>
        </div>

        {/* Register Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:p-0 print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] print:border-black print:text-black">
                  <th className="py-1.5 pr-3 font-bold">Date</th>
                  <th className="py-1.5 pr-3 font-bold">Last Called Date</th>
                  <th className="py-1.5 pr-4 font-bold">Company Name</th>
                  <th className="py-1.5 pr-3 font-bold">Number</th>
                  <th className="py-1.5 pr-3 font-bold">Location</th>
                  <th className="py-1.5 pr-3 font-bold">Staff</th>
                  <th className="py-1.5 pr-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {paginatedData.length > 0 ? (
                  paginatedData.map((row) => (
                    <tr key={row.id} className="text-slate-800 hover:bg-slate-50/70 transition-colors print:hover:bg-transparent">
                      <td className="py-1.5 pr-3 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                        {row.lastCalledDate}
                      </td>
                      <td className="py-1.5 pr-4 font-semibold text-slate-900 print:text-black truncate max-w-[200px]" title={row.company}>
                        {row.company}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[11px] text-slate-700 print:text-black whitespace-nowrap">
                        {row.number}
                      </td>
                      <td className="py-1.5 pr-3 font-medium text-slate-700 print:text-black uppercase text-[11px]">
                        {row.location}
                      </td>
                      <td className="py-1.5 pr-3 font-medium text-slate-800 print:text-black">
                        {row.staff}
                      </td>
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                            row.status === 'Not Interested'
                              ? 'bg-amber-500 text-white'
                              : row.status === 'Called'
                              ? 'bg-cyan-500 text-white'
                              : row.status === 'Quotation Requested'
                              ? 'bg-purple-600 text-white'
                              : row.status === 'Converted'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-500 text-white'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No telecalling register records found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Footer Stats (Matching Screenshot) */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 print:hidden">
            <span>
              Showing {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
            </span>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
