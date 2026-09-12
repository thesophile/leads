import { useEffect, useMemo, useState } from 'react'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import { exportRegisterPdf } from '../../utils/exportRegisterPdf'
import RefreshButton from '../../components/RefreshButton'
import PaginationBar from '../../components/PaginationBar'
import usePagedList, { useDebouncedValue, fetchAllPaged } from '../../utils/usePagedList'

function toDmyDate(value) {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return String(value)
}

// Live telecalling pipeline stages (everything past Raw Data).

// Map a lead returned by the backend into the register row shape. The status
// column reflects the call outcome the lead currently sits at in the pipeline.
function leadToRow(item) {
  const iso = item.date ? String(item.date).slice(0, 10) : ''
  let status = item.callStatus || 'Pending Call'
  if (item.status === 'quotation') status = 'Quotation Requested'
  if (item.status === 'order' || item.status === 'client') status = 'Converted'
  return {
    id: item.id,
    date: toDmyDate(iso),
    rawDate: iso,
    lastCallDate: item.lastCallDate || '',
    company: item.company || '',
    number: item.phone || '',
    location: item.city || '',
    staff: item.assignedTo || '',
    category: item.category || '',
    status,
  }
}

export default function TelecalligRegister() {
  const [categoryOptions, setCategoryOptions] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('All Category')
  const [staff, setStaff] = useState('All Staff')
  const [status, setStatus] = useState('All Status')
  const [location, setLocation] = useState('All Locations')
  const [searchQuery, setSearchQuery] = useState('')

  // Load every lead in the telecalling pipeline plus category options.
  // Categories are loaded independently so a leads failure does not hide them.
  useEffect(() => {
    api
      .get('/master/categories/')
      .then((categories) => {
        if (categories) setCategoryOptions(categories)
      })
      .catch(() => {})
  }, [])

  const searchDebounced = useDebouncedValue(searchQuery)

  const listParams = useMemo(
    () => ({
      statuses: 'assigned,quotation,order,client',
      ...(fromDate ? { date_from: fromDate } : {}),
      ...(toDate ? { date_to: toDate } : {}),
      ...(category !== 'All Category' ? { category } : {}),
      ...(staff !== 'All Staff' ? { staff } : {}),
      ...(status !== 'All Status' ? { status } : {}),
      ...(location !== 'All Locations' ? { city: location } : {}),
      ...(searchDebounced ? { search: searchDebounced } : {}),
    }),
    [fromDate, toDate, category, staff, status, location, searchDebounced]
  )

  const {
    rows,
    count,
    facets,
    loading: isLoading,
    error,
    page,
    totalPages,
    setPage,
    refetch,
  } = usePagedList({ url: '/transactions/leads/register/', params: listParams })

  const registerRows = useMemo(() => rows.map(leadToRow), [rows])

  // Staff, location and status choices come from the server-side facets.
  const staffOptions = useMemo(() => {
    const names = Array.isArray(facets?.staff) && facets.staff.length
      ? facets.staff
      : [...new Set(registerRows.map((r) => r.staff).filter(Boolean))]
    return ['All Staff', ...names.sort((a, b) => a.localeCompare(b))]
  }, [facets, registerRows])

  const locationOptions = useMemo(() => {
    const places = Array.isArray(facets?.locations) && facets.locations.length
      ? facets.locations
      : [...new Set(registerRows.map((r) => r.location).filter(Boolean))]
    return ['All Locations', ...places.sort((a, b) => a.localeCompare(b))]
  }, [facets, registerRows])

  const statusOptions = useMemo(() => {
    const values = Array.isArray(facets?.statuses) && facets.statuses.length
      ? facets.statuses
      : [...new Set(registerRows.map((r) => r.status).filter(Boolean))]
    return ['All Status', ...values.sort((a, b) => a.localeCompare(b))]
  }, [facets, registerRows])

  const [isExporting, setIsExporting] = useState(false)

  const hasActiveFilters =
    fromDate !== '' ||
    toDate !== '' ||
    category !== 'All Category' ||
    staff !== 'All Staff' ||
    status !== 'All Status' ||
    location !== 'All Locations' ||
    searchQuery.trim() !== ''

  function clearAllFilters() {
    setFromDate('')
    setToDate('')
    setCategory('All Category')
    setStaff('All Staff')
    setStatus('All Status')
    setLocation('All Locations')
    setSearchQuery('')
  }

  // The server already applies the filters above.
  const filteredData = registerRows

  async function exportPdf() {
    if (isExporting) return
    setIsExporting(true)
    try {
      const all = await fetchAllPaged('/transactions/leads/register/', listParams)
      const rows = all.map(leadToRow).map((r) => [
        r.date,
        r.lastCallDate,
        r.company,
        r.number,
        r.location,
        r.staff,
        r.status,
      ])
      await exportRegisterPdf({
        title: 'TELECALLING REGISTER',
        fileNamePrefix: 'Telecalling_Register',
        columns: ['Date', 'Last Called', 'Company', 'Number', 'Location', 'Staff', 'Status'],
        rows,
        filters: {
          Category: category !== 'All Category' ? category : '',
          Staff: staff !== 'All Staff' ? staff : '',
          Status: status !== 'All Status' ? status : '',
          Location: location !== 'All Locations' ? location : '',
          From: fromDate || '',
          To: toDate || '',
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 65 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 75 },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 'auto' },
          6: { cellWidth: 'auto' },
        },
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-4 print-sheet">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 print:hidden">
            Could not load telecalling register: {error}
          </div>
        )}

        {/* Screen Only Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
          {/* Top Bar: Title & Export PDF + Search Box */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                ▦
              </span>
              <span>Telecalling Register</span>
            </div>

            {/* Right: Export PDF Button + Search Box */}
            <div className="flex items-center gap-2">
              <RefreshButton onClick={refetch} loading={isLoading} />
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

          {/* Filters are applied live as soon as they change — no Apply button needed */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-7 items-end">
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                {staffOptions.map((s) => (
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                {statusOptions.map((st) => (
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
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
              <h1 className="text-sm font-black uppercase tracking-wider">Telecalling Register</h1>
              <p className="text-[9px] text-slate-600 font-mono">
                Printed: {new Date().toLocaleDateString('en-GB')} | Records: {count}
              </p>
            </div>
          </div>

          {/* Applied Filter Tags */}
          <div className="mt-2 flex flex-wrap gap-2 text-[9px] bg-slate-100 p-1.5 rounded border border-slate-300 font-medium">
            <span><strong>Category:</strong> {category}</span>
            <span>&bull;</span>
            <span><strong>Staff:</strong> {staff}</span>
            <span>&bull;</span>
            <span><strong>Status:</strong> {status}</span>
            <span>&bull;</span>
            <span><strong>Location:</strong> {location}</span>
            {fromDate && (
              <>
                <span>&bull;</span>
                <span><strong>From:</strong> {fromDate}</span>
              </>
            )}
            {toDate && (
              <>
                <span>&bull;</span>
                <span><strong>To:</strong> {toDate}</span>
              </>
            )}
          </div>
        </div>

        {/* Register Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:p-0 print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="register-table w-full text-left text-xs border-collapse">
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
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      Loading telecalling register…
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row) => (
                    <tr key={row.id} className="text-slate-800 hover:bg-slate-50/70 transition-colors print:hover:bg-transparent">
                      <td className="py-1.5 pr-3 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap nowrap-cell">
                        {row.date}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap nowrap-cell">
                        {row.lastCallDate}
                      </td>
                      <td className="py-1.5 pr-4 font-semibold text-slate-900 print:text-black truncate max-w-[200px] company-cell" title={row.company}>
                        {row.company}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[11px] text-slate-700 print:text-black whitespace-nowrap nowrap-cell">
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
                      No telecalling register records found matching the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer stats */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 print:text-black">
            <span>Showing <strong>{count}</strong> total records</span>
            <span className="font-mono text-[10px]">PROGRAMERS INTERNATIONAL &bull; REGISTER AUDIT</span>
          </div>

          <PaginationBar
            page={page}
            totalPages={totalPages}
            count={count}
            pageSize={50}
            onChange={setPage}
            className="print:hidden"
          />
        </div>
      </div>
    </Layout>
  )
}