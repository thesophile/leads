import { useState, useEffect } from 'react'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

const LOGO_TARGET_WIDTH = 400
const LOGO_TARGET_HEIGHT = 160
const LOGO_MAX_MB = 1

function LogoIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function UploadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ header: [2, 3, 4, false] }],
    ['link', 'blockquote'],
    ['clean'],
  ],
}

const QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'link',
  'blockquote',
]

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

function UsersIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function TargetIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function PhoneIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function TrendIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
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

const TABS = [
  { id: 'targets', label: 'Targets & KPIs', icon: SlidersIcon },
  { id: 'general', label: 'General & Finance', icon: BuildingIcon },
  { id: 'backup', label: 'Backup & Logs', icon: DatabaseIcon },
]

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15'

const formatINR = (n) => '₹' + Number(n).toLocaleString('en-IN')

const pctOf = (done, target) => (target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0)

function ProgressCell({ done, target, barClass, format }) {
  const pct = pctOf(done, target)
  const display = (v) => (format ? format(v) : String(v).toLocaleString('en-IN'))
  return (
    <div className="min-w-[150px]">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-mono text-slate-500">
          {display(done)}
          <span className="mx-1 text-slate-300">/</span>
          {display(target)}
        </span>
        <span className={`font-semibold ${pct >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatCard({ label, value, detail, progress, barClass, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
      {progress !== undefined ? (
        <div className="mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">{detail}</p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-400">{detail}</p>
      )}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-4 w-1 rounded-full bg-brand-500" />
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{children}</h3>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('targets')
  const [staffTargets, setStaffTargets] = useState(INITIAL_STAFF_TARGETS)

  const [companyName, setCompanyName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoWarning, setLogoWarning] = useState(null)
  const [termsHtml, setTermsHtml] = useState('')
  const [gstNo, setGstNo] = useState('')
  const [currency, setCurrency] = useState('INR (₹)')
  const [defaultBank, setDefaultBank] = useState('')

  const [selectedStaffName, setSelectedStaffName] = useState('Karthika')
  const [rawLeadsTarget, setRawLeadsTarget] = useState(300)
  const [callsTarget, setCallsTarget] = useState(800)

  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false)
  const [targetDrawerVisible, setTargetDrawerVisible] = useState(false)

  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const company = await api.get('/auth/company/')
        if (!cancelled && company) {
          if (company.name) setCompanyName(company.name)
          if (company.email) setCompanyEmail(company.email)
          if (company.phone) setCompanyPhone(company.phone)
          if (company.website) setCompanyWebsite(company.website)
          if (company.address) setCompanyAddress(company.address)
          setCompanyLogo(company.logo || '')
          if (company.termsHtml) setTermsHtml(company.termsHtml)
        }
      } catch (err) {
        console.error('Failed to load company settings', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function openTargetDrawer() {
    setTargetDrawerVisible(true)
    requestAnimationFrame(() => setTargetDrawerOpen(true))
  }

  function closeTargetDrawer() {
    setTargetDrawerOpen(false)
    setTimeout(() => setTargetDrawerVisible(false), 300)
  }

  async function handleSaveGeneral(e) {
    e.preventDefault()
    try {
      await api.patch('/auth/company/', {
        name: companyName,
        email: companyEmail,
        phone: companyPhone,
        website: companyWebsite,
        address: companyAddress,
        termsHtml,
      })
      showToast('General settings saved successfully.')
    } catch (err) {
      showToast(`Failed to save settings: ${err.message}`)
    }
  }

  function handleLogoFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoWarning(null)
    setLogoFile(file)
  }

  async function uploadLogo(confirm = false) {
    if (!logoFile) return
    setLogoUploading(true)
    setLogoWarning(null)
    try {
      const fd = new FormData()
      fd.append('logo', logoFile)
      if (confirm) fd.append('confirm', '1')
      const res = await fetch('/api/auth/company/logo/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('leads_access') || sessionStorage.getItem('leads_access')}` },
        body: fd,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.detail || `Upload failed (${res.status})`)
      }
      if (data?.status === 'warning') {
        setLogoWarning(data)
        return
      }
      if (data?.logo) setCompanyLogo(data.logo)
      setLogoFile(null)
      showToast('Company logo updated successfully.')
    } catch (err) {
      showToast(`Failed to upload logo: ${err.message}`)
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleConfirmResizeLogo() {
    await uploadLogo(true)
  }

  function handleCancelLogoWarning() {
    setLogoWarning(null)
    setLogoFile(null)
  }

  async function handleRemoveLogo() {
    if (window.confirm('Remove the current company logo?')) {
      try {
        await api.del('/auth/company/logo/')
        setCompanyLogo('')
        setLogoFile(null)
        setLogoWarning(null)
        showToast('Company logo removed.')
      } catch (err) {
        showToast(`Failed to remove logo: ${err.message}`)
      }
    }
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

  const totals = {
    members: staffTargets.length,
    rawTarget: staffTargets.reduce((s, st) => s + st.rawLeadsTarget, 0),
    rawDone: staffTargets.reduce((s, st) => s + st.rawLeadsDone, 0),
    callsTarget: staffTargets.reduce((s, st) => s + st.callsTarget, 0),
    callsDone: staffTargets.reduce((s, st) => s + st.callsDone, 0),
    salesTarget: staffTargets.reduce((s, st) => s + st.salesTarget, 0),
    salesDone: staffTargets.reduce((s, st) => s + st.salesDone, 0),
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckIcon className="h-3 w-3" />
            </span>
            <span className="text-xs font-semibold text-slate-800">{toastMessage}</span>
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage system defaults, tax and bank configuration, employee targets, and maintenance tools
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            System Configuration
          </span>
        </div>

        {/* Tabs */}
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
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
              <StatCard
                label="Team Members"
                value={totals.members}
                detail="Active members with targets"
                icon={<UsersIcon className="h-4 w-4" />}
              />
              <StatCard
                label="Raw Leads"
                value={`${totals.rawDone.toLocaleString('en-IN')}`}
                detail={`${pctOf(totals.rawDone, totals.rawTarget)}% of ${totals.rawTarget.toLocaleString('en-IN')} target`}
                progress={pctOf(totals.rawDone, totals.rawTarget)}
                barClass="bg-brand-500"
                icon={<TargetIcon className="h-4 w-4" />}
              />
              <StatCard
                label="Calls Made"
                value={`${totals.callsDone.toLocaleString('en-IN')}`}
                detail={`${pctOf(totals.callsDone, totals.callsTarget)}% of ${totals.callsTarget.toLocaleString('en-IN')} target`}
                progress={pctOf(totals.callsDone, totals.callsTarget)}
                barClass="bg-indigo-500"
                icon={<PhoneIcon className="h-4 w-4" />}
              />
              <StatCard
                label="Sales Achieved"
                value={formatINR(totals.salesDone)}
                detail={`${pctOf(totals.salesDone, totals.salesTarget)}% of ${formatINR(totals.salesTarget)} target`}
                progress={pctOf(totals.salesDone, totals.salesTarget)}
                barClass="bg-emerald-500"
                icon={<TrendIcon className="h-4 w-4" />}
              />
            </div>

            {/* Team Target Progress */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <SlidersIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Team Target Progress</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">Monthly targets vs actual achievement</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 sm:inline-flex">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    August 2026
                  </span>
                  <button
                    type="button"
                    onClick={openTargetDrawer}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700 transition cursor-pointer"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Set Target
                  </button>
                </div>
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
                          <ProgressCell done={staff.salesDone} target={staff.salesTarget} barClass="bg-emerald-500" format={formatINR} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bulk Adjust Targets */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <ScaleIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Bulk Adjust Targets</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">Scale raw lead and call targets for the entire team at once</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: 'Raw Leads', type: 'raw', factor: 1.1, sign: '+', badge: 'bg-brand-50 text-brand-600 border-brand-100' },
                    { label: 'Calls', type: 'calls', factor: 1.1, sign: '+', badge: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                    { label: 'Raw Leads', type: 'raw', factor: 0.9, sign: '−', badge: 'bg-slate-50 text-slate-500 border-slate-200' },
                    { label: 'Calls', type: 'calls', factor: 0.9, sign: '−', badge: 'bg-slate-50 text-slate-500 border-slate-200' },
                  ].map((b) => (
                    <button
                      key={`${b.type}-${b.factor}`}
                      type="button"
                      onClick={() => handleQuickSetAll(b.type, b.factor)}
                      className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3.5 transition-colors hover:border-brand-200 hover:bg-brand-50/50 cursor-pointer"
                    >
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${b.badge}`}>
                        {b.sign}{Math.abs(Math.round((b.factor - 1) * 100))}%
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-800">
                        {b.label} Target
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden max-w-5xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <BuildingIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Company & Financial Defaults</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Used across quotations, orders, and invoices</p>
              </div>
            </div>

            <form onSubmit={handleSaveGeneral}>
              <div className="grid grid-cols-1 gap-x-12 gap-y-8 px-6 py-6 md:grid-cols-2 md:px-8 md:py-7">
                <div className="space-y-6">
                  <SectionTitle>Company Identity</SectionTitle>
                  <Field label="Company Name">
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Primary Email">
                    <input
                      type="email"
                      required
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. +91 9447151442"
                    />
                  </Field>
                  <Field label="Website">
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. www.company.com"
                    />
                  </Field>
                  <Field label="Address">
                    <textarea
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className={`${inputClass} min-h-20 resize-y`}
                      placeholder="Registered office / head office address"
                    />
                  </Field>
                  <Field label="GSTIN">
                    <input
                      type="text"
                      required
                      value={gstNo}
                      onChange={(e) => setGstNo(e.target.value)}
                      className={`${inputClass} font-mono`}
                      placeholder="e.g. 32AAAAA1111A1Z1"
                    />
                  </Field>
                </div>

                <div className="space-y-6">
                  <SectionTitle>Finance & Bank</SectionTitle>
                  <Field label="Base Currency">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="INR (₹)">INR (₹)</option>
                      <option value="USD ($)">USD ($)</option>
                      <option value="AED (Dh)">AED (Dh)</option>
                    </select>
                  </Field>
                  <Field label="Default Bank">
                    <input
                      type="text"
                      required
                      value={defaultBank}
                      onChange={(e) => setDefaultBank(e.target.value)}
                      className={inputClass}
                      placeholder="eg. ICIC bank"
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-100 px-6 py-6 md:px-8 md:py-7">
                <SectionTitle>Company Logo</SectionTitle>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Shown on the header of every proposal. Recommended size: {LOGO_TARGET_WIDTH}×{LOGO_TARGET_HEIGHT} 
                  px, maximum file size {LOGO_MAX_MB}MB (PNG, JPG, or WEBP).
                </p>

                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-24 w-56 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {companyLogo ? (
                        <img src={companyLogo} alt="Company logo" className="h-full w-full object-contain p-2" />
                      ) : logoFile ? (
                        <img src={URL.createObjectURL(logoFile)} alt="Selected logo preview" className="h-full w-full object-contain p-2" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 px-3 text-center">
                          <LogoIcon className="h-6 w-6 text-slate-300" />
                          <span className="text-[10px] text-slate-400">No logo uploaded</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-[11px] text-slate-500">
                      {!companyLogo && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                          <LogoIcon className="h-3.5 w-3.5" />
                          Uses company name on documents
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                      <UploadIcon className="h-3.5 w-3.5" />
                      {companyLogo ? 'Update Logo' : 'Upload Logo'}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                    </label>
                    {logoFile && !logoUploading && (
                      <button
                        type="button"
                        onClick={() => uploadLogo(false)}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-brand-700 cursor-pointer"
                      >
                        Save Logo
                      </button>
                    )}
                    {logoUploading && (
                      <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                        Uploading…
                      </span>
                    )}
                    {companyLogo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 cursor-pointer"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {logoFile && (
                  <p className="mt-3 text-[11px] text-slate-400">
                    Selected: <span className="font-semibold text-slate-600">{logoFile.name}</span> ({(logoFile.size / 1024).toFixed(0)} KB). Click{" "}
                    <span className="font-semibold text-slate-600">Save Logo</span> to upload. If its dimensions are not {LOGO_TARGET_WIDTH}×{LOGO_TARGET_HEIGHT}px,
                    you will be asked before it is auto-resized.
                  </p>
                )}
              </div>

              <div className="px-6 py-6 md:px-8 md:py-7">
                <SectionTitle>Standard Terms &amp; Conditions</SectionTitle>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Shown on the "Terms &amp; Conditions" box of every proposal. Leave empty to fall back
                  to the built-in default terms.
                </p>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <ReactQuill
                    theme="snow"
                    className="quill-tall"
                    value={termsHtml}
                    onChange={setTermsHtml}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="e.g. 1. Payment Terms: 50% non-refundable advance... "
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
                <p className="text-[11px] text-slate-400">Changes apply immediately to new documents.</p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700 transition cursor-pointer"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <DatabaseIcon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Data Backup</h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">Export a complete snapshot of the system</p>
                </div>
              </div>
              <div className="space-y-4 p-5 text-xs">
                <p className="leading-relaxed text-slate-500">
                  The backup includes master registers, telecalling details, quotations, order forms, and activity logs.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => showToast('Database backup downloaded.')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Download SQL Backup
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Configuration exported.')}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Export JSON Config
                  </button>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-[11px] text-slate-500">
                  <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                  Last automatic backup: Today, 06:00 AM
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <TargetIcon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">System Activity Log</h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">Recent system events and user actions</p>
                </div>
              </div>
              <div className="p-5">
                <div className="font-mono text-[10px] text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-52 overflow-y-auto space-y-2.5">
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

      {logoWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCancelLogoWarning} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <LogoIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Logo dimensions mismatch</h2>
                <p className="text-[11px] text-slate-500">The uploaded logo is not the required size.</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600">{logoWarning.detail}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelLogoWarning}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResizeLogo}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-brand-700 cursor-pointer"
              >
                Auto-Resize to {logoWarning.required_width}×{logoWarning.required_height}px
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <Field label="Employee">
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
                      className={`${inputClass} cursor-pointer`}
                    >
                      {staffTargets.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Raw Leads Target">
                    <input
                      type="number"
                      required
                      value={rawLeadsTarget}
                      onChange={(e) => setRawLeadsTarget(e.target.value)}
                      className={`${inputClass} font-mono`}
                    />
                  </Field>

                  <Field label="Calls Target">
                    <input
                      type="number"
                      required
                      value={callsTarget}
                      onChange={(e) => setCallsTarget(e.target.value)}
                      className={`${inputClass} font-mono`}
                    />
                  </Field>

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