import { useState, useMemo } from 'react'
import Layout from '../../Layout/Layout'

const INITIAL_QUOTATION_REGISTER = [
  { id: 1, date: '24-06-2026', rawDate: '2026-06-24', lastCalledDate: '25-06-2026', company: 'AAA company', number: '9874563258', location: 'Chalakudy', staff: 'Karthika', category: 'Dynamic Website', status: 'Quotation Submitted' },
  { id: 2, date: '20-06-2026', rawDate: '2026-06-20', lastCalledDate: '20-06-2026', company: 'Dummy company 1', number: '9447737955', location: 'Thrissur', staff: 'Karthika', category: 'Static Website', status: 'Quotation Submitted' },
  { id: 3, date: '28-05-2026', rawDate: '2026-05-28', lastCalledDate: '29-05-2026', company: 'Test 123 company', number: '9977665544', location: 'Thrissur', staff: 'Karthika', category: 'Mobile App', status: 'Quotation Submitted' },
  { id: 4, date: '11-08-2026', rawDate: '2026-08-11', lastCalledDate: '12-08-2026', company: 'MANZOOR SUPER SPECIALITY HOSPITAL', number: '9447118234', location: 'Trivandrum', staff: 'Priya Sharma', category: 'Dynamic Website', status: 'Quotation Submitted' },
  { id: 5, date: '09-08-2026', rawDate: '2026-08-09', lastCalledDate: '11-08-2026', company: 'ROYAL PALACE CONVENTION CENTRE', number: '9567112004', location: 'Thrissur', staff: 'Ananya Nair', category: 'Dynamic Website', status: 'Quotation Submitted' },
  { id: 6, date: '08-08-2026', rawDate: '2026-08-08', lastCalledDate: '10-08-2026', company: 'NAMBEESANS LAKSHMI LODGE', number: '9447151442', location: 'Thriprayar', staff: 'Bincy', category: 'Static Website', status: 'Quotation Submitted' },
  { id: 7, date: '07-08-2026', rawDate: '2026-08-07', lastCalledDate: '09-08-2026', company: 'SHADES.IN LUXURY EYEWEAR', number: '9845123991', location: 'Kochi', staff: 'Alex Joseph', category: 'Meta Ads', status: 'Quotation Submitted' },
]

const CATEGORIES = ['All Category', 'Dynamic Website', 'Static Website', 'Mobile App', 'SEO', 'Meta Ads', 'Google Ads']
const STAFF_LIST = ['All Staff', 'Karthika', 'Malavika', 'Husna', 'Bincy', 'Alex Joseph', 'Priya Sharma', 'NIMISHA DAVIS', 'Ananya Nair', 'Shanu VR']
const LOCATIONS = ['Location', 'All Locations', 'Chalakudy', 'Thrissur', 'Thriprayar', 'Kochi', 'Trivandrum', 'Kozhikode', 'Alleppey', 'Palakkad']

export default function QuotationRegister() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('All Category')
  const [staff, setStaff] = useState('All Staff')
  const [location, setLocation] = useState('Location')
  const [searchQuery, setSearchQuery] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Applied Filter State
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    category: 'All Category',
    staff: 'All Staff',
    location: 'Location',
  })

  function handleApplyFilter(e) {
    e.preventDefault()
    setAppliedFilters({
      fromDate,
      toDate,
      category,
      staff,
      location,
    })
    setCurrentPage(1)
  }

  // Filtered dataset
  const filteredData = useMemo(() => {
    return INITIAL_QUOTATION_REGISTER.filter((item) => {
      if (appliedFilters.fromDate && item.rawDate < appliedFilters.fromDate) return false
      if (appliedFilters.toDate && item.rawDate > appliedFilters.toDate) return false
      if (appliedFilters.category !== 'All Category' && item.category !== appliedFilters.category) return false
      if (appliedFilters.staff !== 'All Staff' && item.staff !== appliedFilters.staff) return false
      if (appliedFilters.location !== 'Location' && appliedFilters.location !== 'All Locations' && item.location.toLowerCase() !== appliedFilters.location.toLowerCase()) return false

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
              <span>Quotation Submitted Register</span>
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

          {/* Filter Form (Matching Reference Screenshot) */}
          <form onSubmit={handleApplyFilter} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6 items-end">
            {/* From Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                {STAFF_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
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
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer active:scale-95"
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
              <h1 className="text-sm font-black uppercase tracking-wider">Quotation Submitted Register</h1>
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
                      <td className="py-1.5 pr-3 font-medium text-slate-700 print:text-black text-[11px]">
                        {row.location}
                      </td>
                      <td className="py-1.5 pr-3 font-medium text-slate-800 print:text-black">
                        {row.staff}
                      </td>
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        <span className="inline-block rounded-full bg-emerald-700 px-3 py-0.5 text-[10.5px] font-bold text-white shadow-2xs">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No quotation submitted register records found matching criteria.
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
            {totalPages > 0 && (
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
