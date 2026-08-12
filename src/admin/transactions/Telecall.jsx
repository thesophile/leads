import { useState, useMemo } from 'react'
import Layout from '../../Layout/Layout'

// Static realistic telecalling leads database with rich call history trail
const STATIC_TELECALL_DATA = [
  {
    id: 'TC-101',
    company: 'NEW LIFE MATERNITY HOSPITAL',
    contact: 'Dr. Sarah Ahmed',
    phone: '8714546783',
    email: 'info@newlifehospital.com',
    category: 'Hospital',
    city: 'Calicut',
    assignedTo: 'Priya Sharma',
    callStatus: 'Interested',
    priority: 'Hot', // Assessed after call
    remarks: 'Very interested in CRM software for 3 clinic branches. Wants a demo this Thursday at 3 PM.',
    lastCallDate: '12 Aug 2026',
    nextFollowUpDate: '2026-08-14',
    nextFollowUpTime: '03:00 PM',
    hasFollowUp: true,
    history: [
      {
        id: 'H1',
        dateTime: '12 Aug 2026, 02:45 PM',
        caller: 'Priya Sharma',
        report: 'Called Dr. Sarah Ahmed. She requested an online ERP demo for 3 clinic branches.',
        followUp: '14 Aug 2026, 03:00 PM',
        status: 'Interested',
      },
      {
        id: 'H2',
        dateTime: '10 Aug 2026, 11:30 AM',
        caller: 'Priya Sharma',
        report: 'Initial connection call. Receptionist transferred to director Dr. Sarah.',
        followUp: '12 Aug 2026, 02:30 PM',
        status: 'Follow Up',
      },
    ],
  },
  {
    id: 'TC-102',
    company: 'SHADES.IN LUXURY EYEWEAR',
    contact: 'Rahul Menon',
    phone: '9845123991',
    email: 'contact@shades.in',
    category: 'Cosmetics Store',
    city: 'Kochi',
    assignedTo: 'Alex Joseph',
    callStatus: 'Follow Up',
    priority: 'Warm',
    remarks: 'Spoke with store manager. Decision maker traveling, asked to call back on Monday.',
    lastCallDate: '12 Aug 2026',
    nextFollowUpDate: '2026-08-17',
    nextFollowUpTime: '11:00 AM',
    hasFollowUp: true,
    history: [
      {
        id: 'H3',
        dateTime: '12 Aug 2026, 10:15 AM',
        caller: 'Alex Joseph',
        report: 'Spoke with showroom manager. Managing director is in Dubai, returning Monday.',
        followUp: '17 Aug 2026, 11:00 AM',
        status: 'Follow Up',
      },
    ],
  },
  {
    id: 'TC-103',
    company: 'MANZOOR SUPER SPECIALITY HOSPITAL',
    contact: 'Dr. Manzoor Ali',
    phone: '9447118234',
    email: 'admin@manzoorhospital.org',
    category: 'Hospital',
    city: 'Trivandrum',
    assignedTo: 'Priya Sharma',
    callStatus: 'Quotation Requested',
    priority: 'Hot',
    remarks: 'Approved initial proposal. Requested formal quotation with 10 user licenses.',
    lastCallDate: '11 Aug 2026',
    nextFollowUpDate: '2026-08-13',
    nextFollowUpTime: '10:30 AM',
    hasFollowUp: true,
    history: [
      {
        id: 'H4',
        dateTime: '11 Aug 2026, 04:30 PM',
        caller: 'Priya Sharma',
        report: 'Doctor reviewed demo video on WhatsApp. Requested formal commercial quotation with tax breakup.',
        followUp: '13 Aug 2026, 10:30 AM',
        status: 'Quotation Requested',
      },
      {
        id: 'H5',
        dateTime: '08 Aug 2026, 01:15 PM',
        caller: 'Priya Sharma',
        report: 'Sent introductory brochure and feature comparison PDF.',
        followUp: '11 Aug 2026, 04:00 PM',
        status: 'Follow Up',
      },
    ],
  },
  {
    id: 'TC-104',
    company: 'URBAN LIVING INTERIORS',
    contact: 'Deepak Varma',
    phone: '9744882190',
    email: 'projects@urbanliving.in',
    category: 'Interior Designers',
    city: 'Calicut',
    assignedTo: 'Shanu VR',
    callStatus: 'Not Reachable',
    priority: 'Cold',
    remarks: 'Ringing no response on primary mobile. Tried twice.',
    lastCallDate: '11 Aug 2026',
    nextFollowUpDate: '2026-08-12',
    nextFollowUpTime: '04:00 PM',
    hasFollowUp: true,
    history: [
      {
        id: 'H6',
        dateTime: '11 Aug 2026, 03:20 PM',
        caller: 'Shanu VR',
        report: 'Dialed phone. Call went unanswered after 5 rings.',
        followUp: '12 Aug 2026, 04:00 PM',
        status: 'Not Reachable',
      },
    ],
  },
  {
    id: 'TC-105',
    company: 'ROYAL PALACE CONVENTION CENTRE',
    contact: 'Kabeer Khan',
    phone: '9567112004',
    email: 'events@royalpalace.com',
    category: 'Convention Center',
    city: 'Thrissur',
    assignedTo: 'Ananya Nair',
    callStatus: 'Follow Up',
    priority: 'Warm',
    remarks: 'Requested pricing brochure on WhatsApp before booking meeting.',
    lastCallDate: '10 Aug 2026',
    nextFollowUpDate: '2026-08-15',
    nextFollowUpTime: '02:00 PM',
    hasFollowUp: true,
    history: [
      {
        id: 'H7',
        dateTime: '10 Aug 2026, 05:00 PM',
        caller: 'Ananya Nair',
        report: 'Requested detailed event booking package pricing via WhatsApp.',
        followUp: '15 Aug 2026, 02:00 PM',
        status: 'Follow Up',
      },
    ],
  },
  {
    id: 'TC-106',
    company: 'GLOW & SHINE BEAUTY SALON',
    contact: 'Farzana K',
    phone: '9123456780',
    email: 'glowandshine@gmail.com',
    category: 'Salon & Spa',
    city: 'Kochi',
    assignedTo: null, // Unassigned
    callStatus: 'Pending Call',
    priority: null, // NOT SET
    remarks: 'Newly imported raw contact. Waiting for staff assignment and first call.',
    lastCallDate: '-',
    nextFollowUpDate: '',
    nextFollowUpTime: '',
    hasFollowUp: false,
    history: [],
  },
  {
    id: 'TC-107',
    company: 'APEX AUTO SPA & DETAILING',
    contact: 'Vipin Das',
    phone: '9895001122',
    email: 'apexautospa@yahoo.com',
    category: 'Auto Wash',
    city: 'Kannur',
    assignedTo: null, // Unassigned
    callStatus: 'Pending Call',
    priority: null, // NOT SET
    remarks: 'Website lead intake. Pending telecaller distribution.',
    lastCallDate: '-',
    nextFollowUpDate: '',
    nextFollowUpTime: '',
    hasFollowUp: false,
    history: [],
  },
  {
    id: 'TC-108',
    company: 'KALYAN GRAND RESIDENCY',
    contact: 'Suresh Kumar',
    phone: '9847229911',
    email: 'gm@kalyangrand.com',
    category: 'Convention Center',
    city: 'Kochi',
    assignedTo: 'NIMISHA DAVIS',
    callStatus: 'Quotation Requested',
    priority: 'Hot',
    remarks: 'Looking for integrated billing setup for banquet hall. Needs quotation urgently.',
    lastCallDate: '12 Aug 2026',
    nextFollowUpDate: '2026-08-13',
    nextFollowUpTime: '02:30 PM',
    hasFollowUp: true,
    history: [
      {
        id: 'H8',
        dateTime: '12 Aug 2026, 12:00 PM',
        caller: 'NIMISHA DAVIS',
        report: 'Spoke with General Manager. Discussed hall booking automation and requested quote.',
        followUp: '13 Aug 2026, 02:30 PM',
        status: 'Quotation Requested',
      },
    ],
  },
]

const CALLERS = [
  'All Callers',
  'NIMISHA DAVIS',
  'Shanu VR',
  'Alex Joseph',
  'Priya Sharma',
  'Ananya Nair',
]

const ASSIGNABLE_STAFF = [
  { name: 'NIMISHA DAVIS', role: 'Senior Telecaller' },
  { name: 'Shanu VR', role: 'Sales Lead' },
  { name: 'Alex Joseph', role: 'BDM' },
  { name: 'Priya Sharma', role: 'Telecaller' },
  { name: 'Ananya Nair', role: 'Telecaller' },
  { name: 'Rahul Varma', role: 'Sales Associate' },
]

const STATUSES = [
  'All Status',
  'Pending Call',
  'Interested',
  'Quotation Requested',
  'Follow Up',
  'Considering',
  'Not Reachable',
  'Busy',
  'Not Interested',
]

const CATEGORIES = [
  'All Categories',
  'Hospital',
  'Cosmetics Store',
  'Salon & Spa',
  'Interior Designers',
  'Convention Center',
  'Auto Wash',
  'Fancy Shops',
]

function UsersIcon({ className = 'h-4 w-4 text-brand-600' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function PhoneCallIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function UserFilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CheckCircleIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function CalendarDaysIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function HistoryIcon({ className = 'w-4 h-4 text-brand-600' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 14 14" />
    </svg>
  )
}

export default function Telecall() {
  const [telecallList, setTelecallList] = useState(STATIC_TELECALL_DATA)
  // Top Tab: 'all' | 'assigned' | 'unassigned' | 'followup'
  const [activeTab, setActiveTab] = useState('all')

  // Selected Lead for Follow-Up History
  const [selectedLeadId, setSelectedLeadId] = useState('TC-101')

  const [selectedCaller, setSelectedCaller] = useState('All Callers')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Assign Leads Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignStaff, setAssignStaff] = useState('NIMISHA DAVIS')
  const [assignCategory, setAssignCategory] = useState('All Categories')
  const [assignFromDate, setAssignFromDate] = useState('')
  const [assignToDate, setAssignToDate] = useState('')
  const [assignCount, setAssignCount] = useState(50)
  const [assignSuccessMessage, setAssignSuccessMessage] = useState('')
  
  // Drawer State for Call Logging & Assessment
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeLead, setActiveLead] = useState(null)
  const [formData, setFormData] = useState({
    assignedTo: '',
    callStatus: 'Interested',
    priority: 'Hot',
    remarks: '',
    nextFollowUpDate: '',
    nextFollowUpTime: '10:00 AM',
  })

  // Currently selected lead object for History card
  const selectedLeadForHistory = useMemo(
    () => telecallList.find((item) => item.id === selectedLeadId) || telecallList[0],
    [telecallList, selectedLeadId]
  )

  // Calculations for tab badges & KPI metrics
  const totalAssignedCount = useMemo(
    () => telecallList.filter((item) => item.assignedTo !== null).length,
    [telecallList]
  )
  const totalUnassignedCount = useMemo(
    () => telecallList.filter((item) => item.assignedTo === null).length,
    [telecallList]
  )
  const hotLeadsCount = useMemo(
    () => telecallList.filter((l) => l.priority === 'Hot').length,
    [telecallList]
  )
  const warmLeadsCount = useMemo(
    () => telecallList.filter((l) => l.priority === 'Warm').length,
    [telecallList]
  )
  const coldLeadsCount = useMemo(
    () => telecallList.filter((l) => l.priority === 'Cold').length,
    [telecallList]
  )

  function handleOpenCallModal(lead, e) {
    if (e) e.stopPropagation()
    setActiveLead(lead)
    setSelectedLeadId(lead.id)
    setFormData({
      assignedTo: lead.assignedTo || 'NIMISHA DAVIS',
      callStatus: lead.callStatus || 'Pending Call',
      priority: lead.priority || null, // Keep null if not rated yet
      remarks: lead.remarks || '',
      nextFollowUpDate: lead.nextFollowUpDate || '',
      nextFollowUpTime: lead.nextFollowUpTime || '10:00 AM',
    })
    setDrawerOpen(true)
  }

  function handleSaveCall(e) {
    e.preventDefault()
    if (!activeLead) return

    const isFollowUp =
      formData.callStatus === 'Follow Up' ||
      formData.callStatus === 'Interested' ||
      formData.callStatus === 'Quotation Requested' ||
      formData.callStatus === 'Considering' ||
      Boolean(formData.nextFollowUpDate)

    const isActuallyCalled = formData.callStatus !== 'Pending Call'

    const newHistoryEntry = isActuallyCalled
      ? {
          id: `H_${Date.now()}`,
          dateTime: '12 Aug 2026, 03:00 PM',
          caller: formData.assignedTo,
          report: formData.remarks || 'Call outcome updated.',
          followUp: formData.nextFollowUpDate
            ? `${formData.nextFollowUpDate}, ${formData.nextFollowUpTime}`
            : 'No follow up',
          status: formData.callStatus,
        }
      : null

    setTelecallList((prev) =>
      prev.map((item) =>
        item.id === activeLead.id
          ? {
              ...item,
              assignedTo: formData.assignedTo,
              callStatus: formData.callStatus,
              priority: isActuallyCalled ? formData.priority : (item.priority || formData.priority),
              remarks: formData.remarks || item.remarks,
              nextFollowUpDate: formData.nextFollowUpDate,
              nextFollowUpTime: formData.nextFollowUpTime,
              hasFollowUp: isFollowUp,
              lastCallDate: isActuallyCalled ? 'Today' : item.lastCallDate,
              history: newHistoryEntry
                ? [newHistoryEntry, ...(item.history || [])]
                : (item.history || []),
            }
          : item
      )
    )
    setDrawerOpen(false)
  }

  function handleExecuteAssign(e) {
    e.preventDefault()

    let remainingToAssign = assignCount
    setTelecallList((prev) =>
      prev.map((item) => {
        if (item.assignedTo === null && remainingToAssign > 0) {
          remainingToAssign--
          return {
            ...item,
            assignedTo: assignStaff,
            remarks: `Assigned to ${assignStaff}. Ready for first telecalling contact.`,
          }
        }
        return item
      })
    )

    setAssignSuccessMessage(`✓ Successfully allocated lead(s) to ${assignStaff}!`)
    setTimeout(() => {
      setAssignSuccessMessage('')
      setAssignModalOpen(false)
    }, 1200)
  }

  // Filtered Telecall leads
  const filteredLeads = useMemo(() => {
    return telecallList.filter((item) => {
      // 1. Assignment Tab Filter
      if (activeTab === 'assigned' && item.assignedTo === null) return false
      if (activeTab === 'unassigned' && item.assignedTo !== null) return false

      // 2. Caller filter
      const matchesCaller =
        selectedCaller === 'All Callers' || item.assignedTo === selectedCaller

      // 3. Status filter
      const matchesStatus =
        selectedStatus === 'All Status' || item.callStatus === selectedStatus

      // 4. Priority filter
      let matchesPriority = true
      if (selectedPriority === 'Hot') {
        matchesPriority = item.priority === 'Hot'
      } else if (selectedPriority === 'Warm') {
        matchesPriority = item.priority === 'Warm'
      } else if (selectedPriority === 'Cold') {
        matchesPriority = item.priority === 'Cold'
      }

      // 5. Search query
      const matchesSearch =
        item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCaller && matchesStatus && matchesPriority && matchesSearch
    })
  }, [telecallList, activeTab, selectedCaller, selectedStatus, selectedPriority, searchQuery])

  return (
    <Layout>
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Tele Call
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribute unassigned raw leads to staff, track follow-up history, and log call outcomes.
            </p>
          </div>

          {/* Action Buttons: Assign Leads to Staff & Assessed KPI Metrics */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Main Assign Leads to Staff Button */}
            <button
              type="button"
              onClick={() => setAssignModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-600/20 transition-all hover:bg-brand-700 active:scale-[0.98] cursor-pointer"
            >
              <UsersIcon className="h-4 w-4 text-white" />
              <span>Assign Leads to Staff</span>
            </button>

            {/* Quick Metrics (Only for Qualified / Assessed Leads) */}
            <div className="flex items-center gap-1.5">
              <div className="rounded-xl border border-red-200/80 bg-red-50/60 px-2.5 py-1.5 text-center" title="Qualified Hot Leads">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Hot</span>
                <span className="text-xs font-bold text-red-700 ml-1">
                  {hotLeadsCount}
                </span>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 text-center" title="Qualified Warm Leads">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Warm</span>
                <span className="text-xs font-bold text-amber-700 ml-1">
                  {warmLeadsCount}
                </span>
              </div>
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 px-2.5 py-1.5 text-center" title="Qualified Cold Leads">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Cold</span>
                <span className="text-xs font-bold text-blue-700 ml-1">
                  {coldLeadsCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          {/* Top Segmented Tabs: [ All Leads | Assigned Leads | Not Assigned | Follow Up Scheduled ] */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-3.5">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
              {/* All Leads Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All Leads</span>
                <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                  {telecallList.length}
                </span>
              </button>

              {/* Assigned Leads Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('assigned')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'assigned'
                    ? 'bg-white text-brand-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Assigned Leads</span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                  {totalAssignedCount}
                </span>
              </button>

              {/* Not Assigned Leads Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('unassigned')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'unassigned'
                    ? 'bg-white text-amber-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Not Assigned</span>
                <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-700">
                  {totalUnassignedCount}
                </span>
              </button>
            </div>

            {/* Instruction Tip */}
            <p className="text-xs text-slate-500">
              💡 <em>Click on any lead row to view its complete Follow Up History below.</em>
            </p>
          </div>

          {/* Table Toolbar (Caller Filter + Status Filter + Priority Pills + Search Box) */}
          <div className="flex flex-col gap-3.5 border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Controls: Caller Filter + Status Filter + Priority Filter Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Assigned Caller Dropdown (Only relevant if not in Unassigned tab) */}
                {activeTab !== 'unassigned' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <UserFilterIcon />
                      <span>Caller:</span>
                    </span>
                    <select
                      value={selectedCaller}
                      onChange={(e) => setSelectedCaller(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    >
                      {CALLERS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Dropdown (Right Next to Caller) */}
                <div className={`flex items-center gap-1.5 ${activeTab !== 'unassigned' ? 'pl-2 sm:border-l sm:border-slate-200' : ''}`}>
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <CheckCircleIcon />
                    <span>Status:</span>
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter Pills */}
                <div className="flex items-center gap-1 text-xs pl-2 sm:border-l sm:border-slate-200">
                  {['All', 'Hot', 'Warm', 'Cold'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPriority(p)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        selectedPriority === p
                          ? p === 'Hot'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-800 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p === 'Hot' && (
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-[1px]" />
                      )}
                      {p === 'Warm' && (
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-[1px]" />
                      )}
                      {p === 'Cold' && (
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-[1px]" />
                      )}
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Search Box */}
              <div className="flex items-center">
                <div className="relative flex-1 sm:w-60">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search company, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-l-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Search"
                  className="flex h-[34px] w-9 items-center justify-center rounded-r-lg bg-brand-600 text-white transition hover:bg-brand-700 cursor-pointer"
                >
                  <SearchIcon />
                </button>
              </div>
            </div>
          </div>

          {/* Telecall Table */}
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pr-2 font-semibold w-60">Company</th>
                  <th className="pb-2.5 pr-2 font-semibold w-32">Mobile</th>
                  <th className="pb-2.5 pr-2 font-semibold w-28">Category</th>
                  <th className="pb-2.5 pr-2 font-semibold w-32">Assigned To</th>
                  <th className="pb-2.5 pr-2 font-semibold w-36">Call Status</th>
                  <th className="pb-2.5 pr-2 font-semibold w-20">Priority</th>
                  <th className="pb-2.5 pr-2 font-semibold text-left w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLeadId === lead.id
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-brand-50/80 font-medium'
                            : 'text-slate-600 hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Company */}
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />
                            )}
                            <p className="font-semibold text-slate-900 text-xs">
                              {lead.company}
                            </p>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-2.5 pr-3">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs text-slate-800 hover:text-brand-600 font-medium inline-flex items-center gap-1"
                            title="Click to Call"
                          >
                            <PhoneCallIcon className="h-3 w-3 text-slate-400" />
                            <span>{lead.phone}</span>
                          </a>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 pr-3 font-medium text-slate-800 text-xs">
                          {lead.category}
                        </td>

                        {/* Assigned Caller */}
                        <td className="py-2.5 pr-3">
                          {lead.assignedTo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>{lead.assignedTo}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Not Assigned</span>
                            </span>
                          )}
                        </td>

                        {/* Call Status Badge */}
                        <td className="py-2.5 pr-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                lead.callStatus === 'Interested'
                                  ? 'bg-emerald-500'
                                  : lead.callStatus === 'Quotation Requested'
                                  ? 'bg-purple-500'
                                  : lead.callStatus === 'Considering'
                                  ? 'bg-cyan-500'
                                  : lead.callStatus === 'Follow Up'
                                  ? 'bg-amber-500'
                                  : lead.callStatus === 'Not Reachable'
                                  ? 'bg-slate-400'
                                  : lead.callStatus === 'Pending Call'
                                  ? 'bg-blue-500'
                                  : lead.callStatus === 'Busy'
                                  ? 'bg-orange-400'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span
                              className={`${
                                lead.callStatus === 'Interested'
                                  ? 'text-emerald-700'
                                  : lead.callStatus === 'Quotation Requested'
                                  ? 'text-purple-700'
                                  : lead.callStatus === 'Considering'
                                  ? 'text-cyan-700'
                                  : lead.callStatus === 'Follow Up'
                                  ? 'text-amber-700'
                                  : lead.callStatus === 'Not Reachable'
                                  ? 'text-slate-600'
                                  : lead.callStatus === 'Pending Call'
                                  ? 'text-blue-700'
                                  : lead.callStatus === 'Busy'
                                  ? 'text-orange-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {lead.callStatus}
                            </span>
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-2.5 pr-3">
                          {lead.priority ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  lead.priority === 'Hot'
                                    ? 'bg-red-500'
                                    : lead.priority === 'Warm'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                                }`}
                              />
                              <span
                                className={`${
                                  lead.priority === 'Hot'
                                    ? 'text-red-600'
                                    : lead.priority === 'Warm'
                                    ? 'text-amber-600'
                                    : 'text-blue-600'
                                }`}
                              >
                                {lead.priority}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px] italic">
                              - Not Set -
                            </span>
                          )}
                        </td>

                        {/* Action Button: Log Call / Assign */}
                        <td className="py-2.5 pr-3 text-left">
                          <button
                            type="button"
                            onClick={(e) => handleOpenCallModal(lead, e)}
                            className="flex items-center gap-1 rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-600 hover:text-white transition cursor-pointer shadow-2xs"
                          >
                            <PhoneCallIcon className="h-3 w-3" />
                            <span>{lead.assignedTo ? 'Update' : 'Assign / Call'}</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No telecalling leads found matching criteria in this tab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Static Pagination Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-medium">
              Showing 1 to {filteredLeads.length} of {filteredLeads.length} entries
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded-md bg-brand-50 text-brand-600 font-bold border border-brand-200/60"
              >
                1
              </button>
              <button
                type="button"
                className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Follow Up History Card (Appears Below Table for Selected Lead) */}
        {selectedLeadForHistory && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            {/* History Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Follow Up History & Call Log
                </h3>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-brand-700">
                  {selectedLeadForHistory.company}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({selectedLeadForHistory.contact} - {selectedLeadForHistory.phone})
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCallModal(selectedLeadForHistory)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-600 hover:text-white transition cursor-pointer border border-brand-200/60 self-start sm:self-auto"
              >
                <PhoneCallIcon className="h-3.5 w-3.5" />
                <span>+ Log New Follow-Up</span>
              </button>
            </div>

            {/* Latest Remarks for the selected lead */}
            {selectedLeadForHistory.remarks && selectedLeadForHistory.remarks !== '-' && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-xs">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <p className="text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">Latest remarks: </span>
                  {selectedLeadForHistory.remarks}
                </p>
              </div>
            )}

            {/* History Records Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 pr-2 font-semibold w-40">Date & Time</th>
                    <th className="pb-2.5 pr-2 font-semibold w-36">Staff / Caller</th>
                    <th className="pb-2.5 pr-2 font-semibold w-80">Report / Remarks</th>
                    <th className="pb-2.5 pr-2 font-semibold w-48">Scheduled Follow Up</th>
                    <th className="pb-2.5 pr-2 font-semibold text-left w-36">Outcome Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedLeadForHistory.history && selectedLeadForHistory.history.length > 0 ? (
                    selectedLeadForHistory.history.map((h) => (
                      <tr key={h.id} className="text-slate-600 hover:bg-slate-50/50">
                        {/* Date & Time */}
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-700">
                          {h.dateTime}
                        </td>

                        {/* Caller */}
                        <td className="py-2.5 pr-3 font-medium text-slate-900">
                          {h.caller}
                        </td>

                        {/* Report */}
                        <td className="py-2.5 pr-3 text-slate-700">
                          {h.report}
                        </td>

                        {/* Follow Up */}
                        <td className="py-2.5 pr-3">
                          <span className="font-semibold text-blue-700 text-xs flex items-center gap-1">
                            <CalendarDaysIcon className="h-3 w-3 text-blue-500" />
                            <span>{h.followUp}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 pr-3 text-left">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              h.status === 'Interested'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : h.status === 'Quotation Requested'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200/70'
                                : h.status === 'Follow Up'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                        No previous call follow-up history logged for this lead yet. Click <strong>&ldquo;Log New Follow-Up&rdquo;</strong> to record the first contact.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modern, Highly Refined "Assign Leads to Staff" Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                  <UsersIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Leads to Staff
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribute unassigned raw leads across sales and telecalling teams.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleExecuteAssign} className="p-6 space-y-4">
              {/* Step 1: Select Staff Member */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Select Staff Member
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Target: <strong>{assignStaff}</strong></span>
                  </div>
                </div>

                <div className="relative mt-1">
                  <select
                    value={assignStaff}
                    onChange={(e) => setAssignStaff(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 cursor-pointer"
                  >
                    {ASSIGNABLE_STAFF.map((staff) => (
                      <option key={staff.name} value={staff.name}>
                        {staff.name} — ({staff.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Filter Records & Set Volume */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Filter Lead Pool & Set Volume
                  </span>
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={assignCategory}
                      onChange={(e) => setAssignCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* From Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={assignFromDate}
                      onChange={(e) => setAssignFromDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={assignToDate}
                      onChange={(e) => setAssignToDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Lead Quantity Selector + Presets */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Leads to Assign:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 100, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAssignCount(preset)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer border ${
                            assignCount === preset
                              ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct Input */}
                  <div className="w-28">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Custom Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={totalUnassignedCount || 100}
                      value={assignCount}
                      onChange={(e) => setAssignCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Info Banner */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Ready to assign <strong className="text-slate-900">{assignCount}</strong> leads out of{' '}
                  <strong className="text-brand-600">{totalUnassignedCount}</strong> unassigned records in pool.
                </span>
              </div>

              {assignSuccessMessage && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-700 text-center animate-in fade-in">
                  {assignSuccessMessage}
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-[0.98] cursor-pointer"
                >
                  <span>✓ Assign {assignCount} Lead(s) to {assignStaff}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer: Update Call Outcome, Remarks & Priority */}
      {drawerOpen && activeLead && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-md sm:max-w-lg">
            <div className="flex h-full w-full flex-col bg-white shadow-2xl">
              {/* top accent */}
              <div className="h-1 shrink-0 bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400" />

              {/* Drawer Header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/20">
                  <PhoneCallIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900">Log Tele Call</h2>
                  <p className="text-[11px] text-slate-500">
                    Record outcome, set priority & schedule follow-up
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close drawer"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Customer Summary */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                      {activeLead.company.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold leading-snug text-slate-900">
                        {activeLead.company}
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {activeLead.contact} • {activeLead.category}
                        {activeLead.city ? ` • ${activeLead.city}` : ''}
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold text-slate-800">
                        {activeLead.phone}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              activeLead.callStatus === 'Interested'
                                ? 'bg-emerald-500'
                                : activeLead.callStatus === 'Quotation Requested'
                                ? 'bg-purple-500'
                                : activeLead.callStatus === 'Considering'
                                ? 'bg-cyan-500'
                                : activeLead.callStatus === 'Follow Up'
                                ? 'bg-amber-500'
                                : activeLead.callStatus === 'Not Reachable'
                                ? 'bg-slate-400'
                                : activeLead.callStatus === 'Pending Call'
                                ? 'bg-blue-500'
                                : activeLead.callStatus === 'Busy'
                                ? 'bg-orange-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="text-slate-600">{activeLead.callStatus}</span>
                        </span>
                        {activeLead.priority && (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                activeLead.priority === 'Hot'
                                  ? 'bg-red-500'
                                  : activeLead.priority === 'Warm'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                            <span
                              className={
                                activeLead.priority === 'Hot'
                                  ? 'text-red-600'
                                  : activeLead.priority === 'Warm'
                                  ? 'text-amber-600'
                                  : 'text-blue-600'
                              }
                            >
                              {activeLead.priority}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`tel:${activeLead.phone}`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
                  >
                    <PhoneCallIcon className="h-3.5 w-3.5" />
                    Call Now
                  </a>
                </div>

                {/* Drawer Form */}
                <form id="telecall-form" onSubmit={handleSaveCall} className="mt-5 space-y-5 text-xs">
                  {/* Call Details */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Call Details
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Assigned Caller
                        </label>
                        <select
                          value={formData.assignedTo}
                          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                        >
                          {ASSIGNABLE_STAFF.map((staff) => (
                            <option key={staff.name} value={staff.name}>
                              {staff.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Call Outcome
                        </label>
                        <select
                          value={formData.callStatus}
                          onChange={(e) => setFormData({ ...formData, callStatus: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                        >
                          <option value="Pending Call">Pending Call (Not Called Yet)</option>
                          <option value="Interested">Interested</option>
                          <option value="Considering">Considering</option>
                          <option value="Quotation Requested">Quotation Requested</option>
                          <option value="Follow Up">Follow Up / Call Back</option>
                          <option value="Not Reachable">Not Reachable</option>
                          <option value="Busy">Busy / Meeting</option>
                          <option value="Not Interested">Not Interested</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Priority Rating */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Lead Priority
                      </h4>
                      {formData.priority && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, priority: null })}
                          className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-600"
                        >
                          Clear rating
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Hot', dot: 'bg-red-500', active: 'border-red-500 bg-red-500 text-white shadow-sm shadow-red-500/20' },
                        { label: 'Warm', dot: 'bg-amber-500', active: 'border-amber-500 bg-amber-500 text-white shadow-sm shadow-amber-500/20' },
                        { label: 'Cold', dot: 'bg-blue-500', active: 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/20' },
                      ].map((p) => {
                        const isActive = formData.priority === p.label
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, priority: isActive ? null : p.label })
                            }
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                              isActive
                                ? p.active
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white' : p.dot}`} />
                            {p.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Follow-Up */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                        Next Follow-Up
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 1)
                          setFormData((prev) => ({
                            ...prev,
                            nextFollowUpDate: d.toISOString().split('T')[0],
                          }))
                        }}
                        className="text-[11px] font-semibold text-brand-600 hover:underline"
                      >
                        + Tomorrow
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="date"
                        value={formData.nextFollowUpDate}
                        onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                      />
                      <select
                        value={formData.nextFollowUpTime}
                        onChange={(e) => setFormData({ ...formData, nextFollowUpTime: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-800 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                      >
                        <option value="09:30 AM">09:30 AM (Morning)</option>
                        <option value="10:30 AM">10:30 AM (Morning)</option>
                        <option value="11:30 AM">11:30 AM (Mid-Day)</option>
                        <option value="02:00 PM">02:00 PM (Afternoon)</option>
                        <option value="03:30 PM">03:30 PM (Evening)</option>
                        <option value="05:00 PM">05:00 PM (End of Day)</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Call Remarks / Notes
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter customer requirements, budget, discussion summary..."
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                    />
                  </div>
                </form>
              </div>

              {/* Drawer Footer */}
              <div className="flex shrink-0 items-center gap-2.5 border-t border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="telecall-form"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-600/20 transition hover:from-brand-700 hover:to-brand-800 active:scale-[0.99]"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Save Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
