import { useState } from 'react'
import Layout from '../../Layout/Layout'

const INITIAL_STAFF_TARGETS = [
  { id: 1, name: 'Karthika', role: 'Telecaller', rawLeadsTarget: 300, callsTarget: 800, quotationTarget: 10, salesTarget: 50000, rawLeadsDone: 245, callsDone: 680, quotationDone: 8, salesDone: 35000 },
  { id: 2, name: 'Priya Sharma', role: 'Business Development', rawLeadsTarget: 150, callsTarget: 400, quotationTarget: 30, salesTarget: 250000, rawLeadsDone: 110, callsDone: 320, quotationDone: 24, salesDone: 190000 },
  { id: 3, name: 'Ananya Nair', role: 'Business Development', rawLeadsTarget: 150, callsTarget: 400, quotationTarget: 30, salesTarget: 250000, rawLeadsDone: 135, callsDone: 380, quotationDone: 28, salesDone: 240000 },
  { id: 4, name: 'Alex Joseph', role: 'Sales Lead', rawLeadsTarget: 100, callsTarget: 300, quotationTarget: 40, salesTarget: 400000, rawLeadsDone: 95, callsDone: 280, quotationDone: 38, salesDone: 380000 },
  { id: 5, name: 'Shanu VR', role: 'Managing Director / BD', rawLeadsTarget: 100, callsTarget: 200, quotationTarget: 50, salesTarget: 500000, rawLeadsDone: 120, callsDone: 190, quotationDone: 45, salesDone: 480000 },
  { id: 6, name: 'Bincy', role: 'Executive BD', rawLeadsTarget: 200, callsTarget: 600, quotationTarget: 25, salesTarget: 150000, rawLeadsDone: 180, callsDone: 510, quotationDone: 20, salesDone: 120000 },
  { id: 7, name: 'Malavika', role: 'Telecaller', rawLeadsTarget: 400, callsTarget: 1000, quotationTarget: 5, salesTarget: 20000, rawLeadsDone: 390, callsDone: 920, quotationDone: 4, salesDone: 15000 },
]

function SlidersIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

function BuildingIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  )
}

function DatabaseIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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

function PlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function ScaleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18M5 7h14M6 7l-3 6a3 3 0 0 0 6 0L6 7zm12 0-3 6a3 3 0 0 0 6 0l-3-6z" />
    </svg>
  )
}

const TABS = [
  { id: 'targets', label: 'Targets & KPIs', icon: SlidersIcon },
  { id: 'general', label: 'General & Finance', icon: BuildingIcon },
  { id: 'backup', label: 'Backup & Logs', icon: DatabaseIcon },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('targets')
  const [staffTargets, setStaffTargets] = useState(INITIAL_STAFF_TARGETS)

  const [companyName, setCompanyName] = useState('LEADS PROCRM Pvt Ltd')
  const [companyEmail, setCompanyEmail] = useState('admin@leadsprocrm.com')
  const [gstNo, setGstNo] = useState('32AAAAA1111A1Z1')
  const [currency, setCurrency] = useState('INR (₹)')
  const [defaultBank, setDefaultBank] = useState('ICICI BANK')
  const [bankBranch, setBankBranch] = useState('OPP BISHOP PALACE, EAST FORT, TRICHUR - 680005')

  const [selectedStaffName, setSelectedStaffName] = useState('Karthika')
  const [rawLeadsTarget, setRawLeadsTarget] = useState(300)
  const [callsTarget, setCallsTarget] = useState(800)

  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false)
  const [targetDrawerVisible, setTargetDrawerVisible] = useState(false)

  const [toastMessage, setToastMessage] = useState('')

  function openTargetDrawer() {
    setTargetDrawerVisible(true)
    requestAnimationFrame(() => setTargetDrawerOpen(true))
  }

  function closeTargetDrawer() {
    setTargetDrawerOpen(false)
    setTimeout(() => setTargetDrawerVisible(false), 300)
  }

  function handleSaveGeneral(e) {
    e.preventDefault()
    showToast('General settings saved successfully.')
  }

  function handleUpdateTarget(e) {
    e.preventDefault()
    setStaffTargets((prev) =>
      prev.map((staff) =>
        staff.name.toLowerCase() === selectedStaffName.toLowerCase()
          ? {
              ...staff,
              rawLeadsTarget: Number(rawLeadsTarget),
              callsTarget: Number(callsTarget),
            }
          : staff
      )
    )
    closeTargetDrawer()
    showToast(`Target updated for ${selectedStaffName}.`)
  }

  function handleQuickSetAll(type, multiplier) {
    setStaffTargets((prev) =>
      prev.map((staff) => ({
        ...staff,
        rawLeadsTarget: type === 'raw' ? Math.round(staff.rawLeadsTarget * multiplier) : staff.rawLeadsTarget,
        callsTarget: type === 'calls' ? Math.round(staff.callsTarget * multiplier) : staff.callsTarget,
      }))
    )
    showToast(`All targets scaled by ${multiplier}x.`)
  }

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage('')
    }, 2500)
  }

  const formatINR = (n) => '₹' + Number(n).toLocaleString('en-IN')

  function ProgressCell({ done, target, barClass }) {
    const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0
    return (
      <div className="min-w-[140px]">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-mono">{done}/{target}</span>
          <span className="font-semibold text-slate-700">{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckIcon className="h-3 w-3" />
            </span>
            <span className="text-xs font-semibold text-slate-800">{toastMessage}</span>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            System defaults, tax and bank configuration, employee targets, and maintenance tools
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'targets' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Team Target Progress</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Monthly targets vs actual achievement</p>
                </div>

                <button
                  type="button"
                  onClick={openTargetDrawer}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700 transition cursor-pointer"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Set Target
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3 font-semibold">Member</th>
                      <th className="px-3 py-3 font-semibold">Raw Leads</th>
                      <th className="px-3 py-3 font-semibold">Calls</th>
                      <th className="px-3 py-3 font-semibold">Quotations</th>
                      <th className="px-3 py-3 font-semibold">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffTargets.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{staff.name}</div>
                          <div className="text-[10px] text-slate-400">{staff.role}</div>
                        </td>
                        <td className="px-3 py-3.5">
                          <ProgressCell done={staff.rawLeadsDone} target={staff.rawLeadsTarget} barClass="bg-brand-500" />
                        </td>
                        <td className="px-3 py-3.5">
                          <ProgressCell done={staff.callsDone} target={staff.callsTarget} barClass="bg-indigo-500" />
                        </td>
                        <td className="px-3 py-3.5">
                          <ProgressCell done={staff.quotationDone} target={staff.quotationTarget} barClass="bg-amber-500" />
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-mono">{formatINR(staff.salesDone)}</span>
                              <span className="font-semibold text-slate-700">
                                {staff.salesTarget > 0 ? Math.min(100, Math.round((staff.salesDone / staff.salesTarget) * 100)) : 0}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${staff.salesTarget > 0 ? Math.min(100, Math.round((staff.salesDone / staff.salesTarget) * 100)) : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <ScaleIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Bulk Adjust Targets</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Scale raw lead and call targets for the entire team</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => handleQuickSetAll('raw', 1.1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    +10% Raw Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetAll('calls', 1.1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    +10% Calls
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetAll('raw', 0.9)}
                    className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    -10% Raw Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetAll('calls', 0.9)}
                    className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    -10% Calls
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs max-w-4xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-bold text-slate-800">Company & Financial Defaults</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Used across quotations, orders, and invoices</p>
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-8 p-6 text-xs">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Company Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Primary Email</label>
                    <input
                      type="email"
                      required
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">GSTIN</label>
                    <input
                      type="text"
                      required
                      value={gstNo}
                      onChange={(e) => setGstNo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Base Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                    >
                      <option value="INR (₹)">INR (₹)</option>
                      <option value="USD ($)">USD ($)</option>
                      <option value="AED (Dh)">AED (Dh)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Default Bank Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={defaultBank}
                      onChange={(e) => setDefaultBank(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Branch & Address</label>
                    <input
                      type="text"
                      required
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700 transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-800">Data Backup</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Export a complete snapshot of the system</p>
              </div>
              <div className="space-y-4 p-5 text-xs">
                <p className="text-slate-500 leading-relaxed">
                  The backup includes master registers, telecalling details, quotations, order forms,
                  and activity logs.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => showToast('Database backup downloaded.')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Download SQL Backup
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Configuration exported.')}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Export JSON Config
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-800">System Activity Log</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Recent system events and user actions</p>
              </div>
              <div className="p-5">
                <div className="font-mono text-[10px] text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-52 overflow-y-auto space-y-2">
                  <div>[10:14:02] Shanu VR recorded payment ₹25,000 for ORD-2026-001.</div>
                  <div>[09:55:12] Priya Sharma updated Quotation status to Approved.</div>
                  <div>[09:20:45] System automatic cron task resolved 2 follow-ups.</div>
                  <div>[08:11:00] NIMISHA DAVIS created dynamic quotation QT-2026-024.</div>
                  <div>[07:30:15] Daily target validation reports compiled.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {targetDrawerVisible && (
        <div className="fixed inset-0 z-50">
          <div
            className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
              targetDrawerOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeTargetDrawer}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-md">
            <div
              className={`flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                targetDrawerOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
                  <SlidersIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900">Set Monthly Target</h2>
                  <p className="text-[11px] text-slate-500">Update targets for a team member</p>
                </div>
                <button
                  type="button"
                  onClick={closeTargetDrawer}
                  aria-label="Close drawer"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <form onSubmit={handleUpdateTarget} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Employee</label>
                    <select
                      value={selectedStaffName}
                      onChange={(e) => {
                        setSelectedStaffName(e.target.value)
                        const found = staffTargets.find((s) => s.name === e.target.value)
                        if (found) {
                          setRawLeadsTarget(found.rawLeadsTarget)
                          setCallsTarget(found.callsTarget)
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:border-brand-500 focus:outline-none cursor-pointer"
                    >
                      {staffTargets.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Raw Leads Target</label>
                    <input
                      type="number"
                      required
                      value={rawLeadsTarget}
                      onChange={(e) => setRawLeadsTarget(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Calls Target</label>
                    <input
                      type="number"
                      required
                      value={callsTarget}
                      onChange={(e) => setCallsTarget(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand-600 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700 transition cursor-pointer"
                  >
                    Apply Target
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
