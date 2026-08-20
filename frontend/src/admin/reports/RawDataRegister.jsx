import { useState, useMemo } from 'react'
import Layout from '../../Layout/Layout'

const INITIAL_RAW_DATA_REGISTER = [
  { id: 1, date: '11-08-2026', rawDate: '2026-08-11', company: 'LAVENDER BEAUTY LOUNGE, CHETTIKULANGARA', number: '9567484794', location: 'ALLEPPEY', staff: 'Malavika', category: 'Beauty Parlour' },
  { id: 2, date: '11-08-2026', rawDate: '2026-08-11', company: 'DAZZLE BEAUTY LOUNGE.', number: '9496750735', location: 'ALLEPPEY', staff: 'Malavika', category: 'Beauty Parlour' },
  { id: 3, date: '11-08-2026', rawDate: '2026-08-11', company: "GLAM N' GLOW BY SHEEJA", number: '9447994799', location: 'ALLEPPEY', staff: 'Malavika', category: 'Beauty Parlour' },
  { id: 4, date: '11-08-2026', rawDate: '2026-08-11', company: "MAYA'S CINDERELLA UNISEX SALON", number: '8848131144', location: 'ALLEPPEY', staff: 'Malavika', category: 'Salon' },
  { id: 5, date: '11-08-2026', rawDate: '2026-08-11', company: 'PARVANAM HAIR&FLAIR', number: '9747088330', location: 'ALLEPPEY', staff: 'Malavika', category: 'Salon' },
  { id: 6, date: '11-08-2026', rawDate: '2026-08-11', company: 'RAREKUTS UNISEX FAMILY SALON', number: '6282362331', location: 'ALLEPPEY', staff: 'Malavika', category: 'Salon' },
  { id: 7, date: '11-08-2026', rawDate: '2026-08-11', company: 'MANTRA MAKEOVER STUDIO', number: '9400539788', location: 'ALLEPPEY', staff: 'Malavika', category: 'Beauty Parlour' },
  { id: 8, date: '11-08-2026', rawDate: '2026-08-11', company: 'LEBEN ROUGE - KAYAMKULAM', number: '9497407656', location: 'ALLEPPEY', staff: 'Malavika', category: 'Salon' },
  { id: 9, date: '11-08-2026', rawDate: '2026-08-11', company: 'L♥FLORA BEAUTY CARE', number: '8921518131', location: 'ALLEPPEY', staff: 'Malavika', category: 'Beauty Parlour' },
  { id: 10, date: '11-08-2026', rawDate: '2026-08-11', company: 'CLAIR UNISEX BEAUTY SALON & SPA, KAYAMKULAM', number: '9947277170', location: 'ALLEPPEY', staff: 'Malavika', category: 'Salon' },
  { id: 11, date: '11-08-2026', rawDate: '2026-08-11', company: "SUKANYA'S KAYA FAMILY SALON", number: '9048088819', location: 'ALLEPPEY', staff: 'Malavika', category: 'Salon' },
  { id: 12, date: '11-08-2026', rawDate: '2026-08-11', company: 'REMAKE FAMILY SALON', number: '7306504435', location: 'ALLEPPEY', staff: 'Malavika', category: 'Salon' },
  { id: 13, date: '11-08-2026', rawDate: '2026-08-11', company: 'ASSORT BAY', number: '9633345333', location: 'ALLEPPEY', staff: 'Malavika', category: 'Boutique' },
  { id: 14, date: '11-08-2026', rawDate: '2026-08-11', company: 'ANSHAS BRIDAL MAKEOVER STUDIO ARTHUNKAL', number: '9497011921', location: 'ALLEPPEY', staff: 'Malavika', category: 'Beauty Parlour' },
  { id: 15, date: '11-08-2026', rawDate: '2026-08-11', company: 'THE GLOW ZONE MAKEUP STUDIO', number: '9496872921', location: 'ALLEPPEY', staff: 'Malavika', category: 'Beauty Parlour' },
  { id: 16, date: '11-08-2026', rawDate: '2026-08-11', company: 'LAVANYA BEAUTY PARLOUR & MAKE UP STUDIO (LADIES ONLY)', number: '9388908438', location: 'ALLEPPEY', staff: 'Malavika', category: 'Beauty Parlour' },
  { id: 17, date: '10-08-2026', rawDate: '2026-08-10', company: 'MANZOOR SUPER SPECIALITY HOSPITAL', number: '9447118234', location: 'TRIVANDRUM', staff: 'Alex Joseph', category: 'Hospital' },
  { id: 18, date: '10-08-2026', rawDate: '2026-08-10', company: 'ROYAL PALACE CONVENTION CENTRE', number: '9567112004', location: 'THRISSUR', staff: 'Shanu VR', category: 'Resort' },
  { id: 19, date: '09-08-2026', rawDate: '2026-08-09', company: 'NAMBEESANS LAKSHMI LODGE', number: '9447151442', location: 'THRISSUR', staff: 'Husna', category: 'Resort' },
  { id: 20, date: '09-08-2026', rawDate: '2026-08-09', company: 'SHADES.IN LUXURY EYEWEAR', number: '9845123991', location: 'ERNAKULAM', staff: 'Alex Joseph', category: 'Boutique' },
  { id: 21, date: '08-08-2026', rawDate: '2026-08-08', company: 'CALICUT AYURVEDIC WELLNESS RETREAT', number: '9495110842', location: 'KOZHIKODE', staff: 'Bincy', category: 'Clinic' },
]

const CATEGORIES = ['All Category', 'Beauty Parlour', 'Salon', 'Hospital', 'Clinic', 'Resort', 'Boutique']
const STAFF_LIST = ['All Staff', 'Malavika', 'Husna', 'Bincy', 'Alex Joseph', 'Priya Sharma', 'NIMISHA DAVIS', 'Ananya Nair', 'Shanu VR']
const LOCATIONS = ['All Locations', 'ALLEPPEY', 'THRISSUR', 'ERNAKULAM', 'KOZHIKODE', 'TRIVANDRUM', 'KANNUR', 'PALAKKAD']

export default function RawDataRegister() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('All Category')
  const [staff, setStaff] = useState('All Staff')
  const [location, setLocation] = useState('All Locations')
  const [searchQuery, setSearchQuery] = useState('')

  // Applied Filter state
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    category: 'All Category',
    staff: 'All Staff',
    location: 'All Locations',
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
  }

  // Filtered dataset
  const filteredData = useMemo(() => {
    return INITIAL_RAW_DATA_REGISTER.filter((item) => {
      // Date filter
      if (appliedFilters.fromDate && item.rawDate < appliedFilters.fromDate) return false
      if (appliedFilters.toDate && item.rawDate > appliedFilters.toDate) return false

      // Category filter
      if (appliedFilters.category !== 'All Category' && item.category !== appliedFilters.category) return false

      // Staff filter
      if (appliedFilters.staff !== 'All Staff' && item.staff !== appliedFilters.staff) return false

      // Location filter
      if (appliedFilters.location !== 'All Locations' && item.location !== appliedFilters.location) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.company.toLowerCase().includes(q) ||
          item.number.includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.staff.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [appliedFilters, searchQuery])

  return (
    <Layout>
      <div className="space-y-4">
        {/* Screen Only Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
          {/* Top Bar: Title & Print + Search Box */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                ▦
              </span>
              <span>Raw Data Register</span>
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

        {/* Printable Official Register Header (Only Visible When Printed) */}
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
              <h1 className="text-sm font-black uppercase tracking-wider">Raw Data Register</h1>
              <p className="text-[9px] text-slate-600 font-mono">
                Printed: {new Date().toLocaleDateString('en-GB')} | Records: {filteredData.length}
              </p>
            </div>
          </div>

          {/* Applied Filter Tags */}
          <div className="mt-2 flex flex-wrap gap-2 text-[9px] bg-slate-100 p-1.5 rounded border border-slate-300 font-medium">
            <span><strong>Category:</strong> {appliedFilters.category}</span>
            <span>&bull;</span>
            <span><strong>Staff:</strong> {appliedFilters.staff}</span>
            <span>&bull;</span>
            <span><strong>Location:</strong> {appliedFilters.location}</span>
            {appliedFilters.fromDate && (
              <>
                <span>&bull;</span>
                <span><strong>From:</strong> {appliedFilters.fromDate}</span>
              </>
            )}
            {appliedFilters.toDate && (
              <>
                <span>&bull;</span>
                <span><strong>To:</strong> {appliedFilters.toDate}</span>
              </>
            )}
          </div>
        </div>

        {/* Register Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:p-0 print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] print:border-black print:text-black">
                  <th className="py-1.5 pr-4 font-bold">Date</th>
                  <th className="py-1.5 pr-4 font-bold">Company</th>
                  <th className="py-1.5 pr-4 font-bold">Number</th>
                  <th className="py-1.5 pr-4 font-bold">Location</th>
                  <th className="py-1.5 pr-2 font-bold">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {filteredData.length > 0 ? (
                  filteredData.map((row) => (
                    <tr key={row.id} className="text-slate-800 hover:bg-slate-50/70 transition-colors print:hover:bg-transparent">
                      <td className="py-1.5 pr-4 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-1.5 pr-4 font-semibold text-slate-900 print:text-black truncate max-w-[200px]" title={row.company}>
                        {row.company}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-[11px] text-slate-700 print:text-black whitespace-nowrap">
                        {row.number}
                      </td>
                      <td className="py-1.5 pr-4 font-medium text-slate-700 print:text-black uppercase text-[11px]">
                        {row.location}
                      </td>
                      <td className="py-1.5 pr-2 font-medium text-slate-800 print:text-black">
                        {row.staff}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No raw data register records found matching the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer stats */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 print:text-black">
            <span>Showing <strong>{filteredData.length}</strong> total records</span>
            <span className="font-mono text-[10px]">PROGRAMERS INTERNATIONAL &bull; REGISTER AUDIT</span>
          </div>
        </div>
      </div>
    </Layout>
  )
}
