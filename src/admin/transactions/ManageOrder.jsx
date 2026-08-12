import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import Layout from '../../Layout/Layout'
import { PROPOSAL_TEMPLATES } from './proposalTemplates'

// Initial dataset of approved orders ready for execution
const INITIAL_ORDERS_DATA = [
  {
    id: 'P2025-0004',
    leadId: 'TC-108',
    proposalNo: 'P2026-0004',
    proposalDate: '25-06-2026',
    customer: 'Karthika Nambeesan',
    company: 'NAMBEESANS LAKSHMI LODGE',
    mobile: '9447151442',
    email: 'bookings@nambeesanslodge.com',
    city: 'Thriprayar, Thrissur, Kerala',
    bdm: 'Husna',
    proposalBy: 'Bincy',
    staff: 'Bincy',
    date: '12-12-2024',
    status: 'In Progress',
    total: '50000/-',
    discount: '5000/-',
    netAmount: '45,000.00/-',
    currency: 'INR (₹)',
    category: 'Static & Dynamic Web',
    bankName: 'ICICI BANK',
    bankBranch: 'OPP BISHOP PALACE , EAST FORT TRICHUR. Pin : 680005',
    remarks: '50% advance received via UPI. Frontend UI design and photo gallery under development.',
    scope: `<p>To,</p>
<p><strong>The Managing Director</strong><br/>
Nambeesans Lakshmi Lodge, Thriprayar, Thrissur</p>
<p><strong>Sub: - Website Redesign Quotation Nambeesans Lakshmi Lodge</strong></p>
<br/>
<p><strong>Domain + Server + SSL Cost</strong></p>
<p>Domian And Server Registration for one year Cost: Already registered<br/>
SSL Certificate Cost INR 3500: NA</p>
<br/>
<p><strong>Website Development – Static</strong></p>
<p>We propose to design and develop a professional, mobile-friendly website for Nambeesans Lakshmi Lodge.</p>
<br/>
<p><strong>Features Included:</strong></p>
<p>* Home Page<br/>
* About Us<br/>
* Facilities</p>`,
    details: `<p>* Gallery<br/>
* Tariff<br/>
* Restaurants<br/>
* Contact Page</p>
<p>Restaurant page/section will be developed as a Dynamic page for easy image updates.</p>
<br/>
<p><strong>Pricing:</strong></p>
<p>Website Development: ₹20,000<br/>
Discount: ₹2,000<br/>
Final Amount: <strong>₹18,000</strong></p>
<br/>
<p><strong>Google Business Profile Management:</strong></p>
<p>Management of 2 Google Business Profiles including:</p>
<p>* Profile Updates<br/>
* Photo Uploads<br/>
* Review Monitoring<br/>
* Performance Optimization</p>
<p><strong>Monthly Charge: ₹5,000</strong></p>`,
  },
  {
    id: 'ORD-2026-002',
    leadId: 'TC-103',
    proposalNo: 'QT-2026-001',
    proposalDate: '12-08-2026',
    customer: 'Dr. Manzoor Ali',
    company: 'MANZOOR SUPER SPECIALITY HOSPITAL',
    mobile: '9447118234',
    email: 'director@manzoorhospital.org',
    city: 'Trivandrum, Kerala',
    bdm: 'Alex Joseph',
    proposalBy: 'Priya Sharma',
    staff: 'Priya Sharma',
    date: '12-08-2026',
    status: 'Order Created',
    total: '1,45,000/-',
    discount: '10,000/-',
    netAmount: '1,35,000.00/-',
    currency: 'INR (₹)',
    category: 'Dynamic Web & OPD Suite',
    bankName: 'ICICI BANK',
    bankBranch: 'OPP BISHOP PALACE , EAST FORT TRICHUR. Pin : 680005',
    remarks: 'Approved by Super Admin. Order Form generated and ready to dispatch to hospital director.',
    scope: `<h3>Hospital Clinical Management & Web Portal</h3>
<p>End-to-end OPD patient registration, doctor desk EHR, and cloud hosting.</p>`,
    details: `<h4>1. Modules</h4>
<p>Doctor consultation desk, pharmacy billing POS, and WhatsApp appointment reminders.</p>`,
  },
  {
    id: 'ORD-2026-003',
    leadId: 'TC-105',
    proposalNo: 'QT-2026-004',
    proposalDate: '10-08-2026',
    customer: 'Kabeer Khan',
    company: 'ROYAL PALACE CONVENTION CENTRE',
    mobile: '9567112004',
    email: 'events@royalpalacekerala.com',
    city: 'Thrissur, Kerala',
    bdm: 'Shanu VR',
    proposalBy: 'Ananya Nair',
    staff: 'Ananya Nair',
    date: '11-08-2026',
    status: 'In Progress',
    total: '95,000/-',
    discount: '5,000/-',
    netAmount: '90,000.00/-',
    currency: 'INR (₹)',
    category: 'Dynamic Web Portal',
    bankName: 'ICICI BANK',
    bankBranch: 'EAST FORT TRICHUR',
    remarks: '50% token advance received via RTGS. Banquet hall calendar engine underway.',
    scope: `<h3>Smart Venue Booking & Catering Reservation Portal</h3>
<p>Banquet hall scheduling and catering management system.</p>`,
    details: `<h4>1. Deliverables</h4>
<p>Multi-hall availability calendar with advance payment gateway integration.</p>`,
  },
  {
    id: 'ORD-2026-004',
    leadId: 'TC-102',
    proposalNo: 'QT-2026-005',
    proposalDate: '08-08-2026',
    customer: 'Rahul Menon',
    company: 'SHADES.IN LUXURY EYEWEAR',
    mobile: '9845123991',
    email: 'management@shades.in',
    city: 'Kochi, Kerala',
    bdm: 'Alex Joseph',
    proposalBy: 'Alex Joseph',
    staff: 'Alex Joseph',
    date: '10-08-2026',
    status: 'Completed',
    total: '55,000/-',
    discount: '8,000/-',
    netAmount: '47,000.00/-',
    currency: 'INR (₹)',
    category: 'Social Media Ads & Meta',
    bankName: 'ICICI BANK',
    bankBranch: 'MG ROAD KOCHI',
    remarks: 'Campaign setup complete. 100% realized settlement verified.',
    scope: `<h3>Omnichannel Meta Ads & Brand Awareness</h3>
<p>Full-funnel direct-response Instagram & Facebook marketing campaign.</p>`,
    details: `<h4>1. Deliverables</h4>
<p>Ad creative design, Pixel CAPI server tracking, and weekly ROAS optimization.</p>`,
  },
]

const STAFF_LIST = [
  'All Staff',
  'Husna',
  'Bincy',
  'Alex Joseph',
  'Priya Sharma',
  'NIMISHA DAVIS',
  'Ananya Nair',
  'Shanu VR',
]

const STATUS_LIST = [
  'All Status',
  'Order Created',
  'In Progress',
  'Pending Sign-off',
  'Completed',
  'Cancelled',
]

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

function EyeIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PencilIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

function SendIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function MoreVerticalIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function ManageOrder() {
  const navigate = useNavigate()
  const [ordersList, setOrdersList] = useState(INITIAL_ORDERS_DATA)
  const [selectedStaff, setSelectedStaff] = useState('All Staff')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [searchQuery, setSearchQuery] = useState('')
  const [openDropdownId, setOpenDropdownId] = useState(null)

  // Modal State for Order Form Editor
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const [bdm, setBdm] = useState('Husna')
  const [proposalBy, setProposalBy] = useState('Bincy')
  const [customerPerson, setCustomerPerson] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [mobileNum, setMobileNum] = useState('')
  const [categoryName, setCategoryName] = useState('Dynamic Website')
  const [orderDate, setOrderDate] = useState('12-12-2024')
  const [proposalDate, setProposalDate] = useState('25-06-2026')
  const [proposalNo, setProposalNo] = useState('P2026-0004')

  const [orderSummaryHtml, setOrderSummaryHtml] = useState('')
  const [orderInDetailsHtml, setOrderInDetailsHtml] = useState('')

  const [totalVal, setTotalVal] = useState('50,000')
  const [discountVal, setDiscountVal] = useState('5,000')
  const [netVal, setNetVal] = useState('45,000.00')
  const [bankName, setBankName] = useState('ICICI BANK')
  const [bankBranch, setBankBranch] = useState('OPP BISHOP PALACE, EAST FORT, TRICHUR. Pin : 680005')
  const [remarksVal, setRemarksVal] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')

  function handleViewOrder(order) {
    navigate(`/orders/preview/${order.id}`, { state: { order } })
  }

  function handleSelectTemplate(templateId) {
    setSelectedTemplateId(templateId)
    const tpl = PROPOSAL_TEMPLATES.find((t) => t.id === templateId)
    if (tpl) {
      setOrderSummaryHtml(tpl.scopeHtml)
      setOrderInDetailsHtml(tpl.detailHtml)
      setCategoryName(tpl.category)
      setTotalVal(tpl.defaultTotal)
      setDiscountVal(tpl.defaultDiscount)
    }
  }

  function handleOpenOrderModal(order = null) {
    if (order) {
      setEditingOrderId(order.id)
      setBdm(order.bdm || 'Husna')
      setProposalBy(order.proposalBy || order.staff || 'Bincy')
      setCustomerPerson(order.customer || '')
      setCompanyName(order.company || '')
      setMobileNum(order.mobile || '')
      setCategoryName(order.category || 'Dynamic Website')
      setOrderDate(order.date || '12-12-2024')
      setProposalDate(order.proposalDate || '25-06-2026')
      setProposalNo(order.proposalNo || 'P2026-0004')
      setOrderSummaryHtml(order.scope || order.orderSummaryHtml || '')
      setOrderInDetailsHtml(order.details || order.orderInDetailsHtml || '')
      setTotalVal(order.total || '50,000')
      setDiscountVal(order.discount || '5,000')
      setNetVal(order.netAmount || '45,000.00')
      setBankName(order.bankName || 'ICICI BANK')
      setBankBranch(order.bankBranch || 'OPP BISHOP PALACE, EAST FORT, TRICHUR. Pin : 680005')
      setRemarksVal(order.remarks || '')
    } else {
      // New order
      setEditingOrderId(null)
      setBdm('Husna')
      setProposalBy('Bincy')
      setCustomerPerson('')
      setCompanyName('')
      setMobileNum('')
      setCategoryName('Dynamic Website')
      setOrderDate('Today')
      setProposalDate('Today')
      setProposalNo(`P2026-${String(ordersList.length + 1).padStart(4, '0')}`)
      const defaultTpl = PROPOSAL_TEMPLATES[0]
      setOrderSummaryHtml(defaultTpl?.scopeHtml || '')
      setOrderInDetailsHtml(defaultTpl?.detailHtml || '')
      setTotalVal(defaultTpl?.defaultTotal || '50,000')
      setDiscountVal(defaultTpl?.defaultDiscount || '5,000')
      setNetVal('45,000.00')
      setBankName('ICICI BANK')
      setBankBranch('OPP BISHOP PALACE, EAST FORT, TRICHUR. Pin : 680005')
      setRemarksVal('')
    }
    setOrderModalOpen(true)
  }

  function handleSubmitOrder(e) {
    e.preventDefault()

    if (editingOrderId) {
      // Update existing
      setOrdersList((prev) =>
        prev.map((item) =>
          item.id === editingOrderId
            ? {
                ...item,
                customer: customerPerson || item.customer,
                company: companyName || item.company,
                mobile: mobileNum || item.mobile,
                bdm,
                proposalBy,
                staff: proposalBy,
                total: totalVal,
                discount: discountVal,
                netAmount: netVal,
                bankName,
                bankBranch,
                remarks: remarksVal,
                scope: orderSummaryHtml,
                details: orderInDetailsHtml,
              }
            : item
        )
      )
      setSubmitMessage('✓ Order Form updated successfully!')
    } else {
      // Create new
      const newOrder = {
        id: `P2026-${String(ordersList.length + 1).padStart(4, '0')}`,
        leadId: `TC-${Date.now().toString().slice(-3)}`,
        proposalNo,
        proposalDate,
        customer: customerPerson || 'New Client',
        company: companyName || 'Enterprise Client',
        mobile: mobileNum || '9800000000',
        email: 'info@client.com',
        city: 'Kerala',
        bdm,
        proposalBy,
        staff: proposalBy,
        date: orderDate,
        status: 'Order Created',
        total: totalVal,
        discount: discountVal,
        netAmount: netVal,
        currency: 'INR (₹)',
        category: categoryName,
        bankName,
        bankBranch,
        remarks: remarksVal,
        scope: orderSummaryHtml,
        details: orderInDetailsHtml,
      }
      setOrdersList([newOrder, ...ordersList])
      setSubmitMessage('✓ New Order Form generated!')
    }

    setTimeout(() => {
      setSubmitMessage('')
      setOrderModalOpen(false)
    }, 1000)
  }

  function handleUpdateOrderStatus(orderId, nextStatus, e) {
    e.stopPropagation()
    setOrdersList((prev) =>
      prev.map((item) =>
        item.id === orderId
          ? {
              ...item,
              status: nextStatus,
            }
          : item
      )
    )
    setOpenDropdownId(null)
  }

  // Filtered dataset
  const filteredOrders = useMemo(() => {
    return ordersList.filter((item) => {
      const matchesStaff =
        selectedStaff === 'All Staff' || item.staff === selectedStaff || item.bdm === selectedStaff || item.proposalBy === selectedStaff

      const matchesStatus =
        selectedStatus === 'All Status' || item.status === selectedStatus

      const matchesSearch =
        item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mobile.includes(searchQuery) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.proposalNo.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesStaff && matchesStatus && matchesSearch
    })
  }, [ordersList, selectedStaff, selectedStatus, searchQuery])

  // Metric counts
  const totalOrdersCount = ordersList.length
  const inProgressCount = useMemo(
    () => ordersList.filter((o) => o.status === 'In Progress').length,
    [ordersList]
  )
  const createdCount = useMemo(
    () => ordersList.filter((o) => o.status === 'Order Created').length,
    [ordersList]
  )
  const completedCount = useMemo(
    () => ordersList.filter((o) => o.status === 'Completed').length,
    [ordersList]
  )

  return (
    <Layout>
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Manage Orders &amp; Executions
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate official Order Forms, track client sign-offs, and monitor project execution.
            </p>
          </div>

          {/* Quick Metrics & Create Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Total</span>
                <span className="text-xs font-bold text-slate-900 ml-1">{totalOrdersCount}</span>
              </div>
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Created</span>
                <span className="text-xs font-bold text-blue-700 ml-1">{createdCount}</span>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">In Progress</span>
                <span className="text-xs font-bold text-amber-700 ml-1">{inProgressCount}</span>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Completed</span>
                <span className="text-xs font-bold text-emerald-700 ml-1">{completedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Orders Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          {/* Table Toolbar (Staff Filter + Status Filter + Search) */}
          <div className="flex flex-col gap-3.5 border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Staff Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Staff:
                  </span>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    {STAFF_LIST.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Status:
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    {STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Search Box */}
              <div className="flex items-center">
                <div className="relative flex-1 sm:w-64">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search Order ID, client, proposal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pr-2 font-semibold">Order ID</th>
                  <th className="pb-2.5 pr-2 font-semibold">Customer</th>
                  <th className="pb-2.5 pr-2 font-semibold">Company</th>
                  <th className="pb-2.5 pr-2 font-semibold">Mobile</th>
                  <th className="pb-2.5 pr-2 font-semibold">BDO / Staff</th>
                  <th className="pb-2.5 pr-2 font-semibold">Order Date</th>
                  <th className="pb-2.5 pr-2 font-semibold">Net Amount</th>
                  <th className="pb-2.5 pr-2 font-semibold">Status</th>
                  <th className="pb-2.5 pr-2 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="text-slate-600 hover:bg-slate-50/60 transition-colors">
                      {/* Order ID */}
                      <td className="py-2.5 pr-3 font-mono font-bold text-slate-950">
                        {order.id}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        {order.customer}
                      </td>

                      {/* Company */}
                      <td className="py-2.5 pr-3 text-slate-700">
                        {order.company}
                      </td>

                      {/* Mobile */}
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-600">
                        {order.mobile}
                      </td>

                      {/* Staff */}
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                          <span>{order.proposalBy || order.bdm}</span>
                        </span>
                      </td>

                      {/* Order Date */}
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-600">
                        {order.date}
                      </td>

                      {/* Net Amount */}
                      <td className="py-2.5 pr-3 font-mono font-bold text-slate-900">
                        ₹{order.netAmount}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                            order.status === 'Order Created'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : order.status === 'In Progress'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : order.status === 'Completed'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              order.status === 'Order Created'
                                ? 'bg-blue-500'
                                : order.status === 'In Progress'
                                ? 'bg-amber-500 animate-pulse'
                                : order.status === 'Completed'
                                ? 'bg-emerald-500'
                                : 'bg-slate-500'
                            }`}
                          />
                          <span>{order.status}</span>
                        </span>
                      </td>

                      {/* Action: 3-Dot Action Menu */}
                      <td className="py-2.5 pr-3 text-center">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenDropdownId(openDropdownId === order.id ? null : order.id)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer mx-auto"
                            title="Order Actions"
                          >
                            <MoreVerticalIcon className="h-4 w-4" />
                          </button>

                          {/* Floating Action Dropdown Menu */}
                          {openDropdownId === order.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdownId(null)
                                }}
                              />
                              <div className="absolute right-0 z-40 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-950/5 animate-in fade-in zoom-in-95 duration-100 text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenDropdownId(null)
                                    handleViewOrder(order)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                                >
                                  <EyeIcon className="h-3.5 w-3.5 text-blue-600" />
                                  <span>View Order Form</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenDropdownId(null)
                                    handleOpenOrderModal(order)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer"
                                >
                                  <PencilIcon className="h-3.5 w-3.5 text-purple-600" />
                                  <span>Edit Order Details</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenDropdownId(null)
                                    alert(`Order Form ${order.id} dispatched to ${order.customer} via WhatsApp/Email!`)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                                >
                                  <SendIcon className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Send to Client</span>
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                <button
                                  type="button"
                                  onClick={(e) => handleUpdateOrderStatus(order.id, 'In Progress', e)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition cursor-pointer"
                                >
                                  <span>Mark In Progress</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleUpdateOrderStatus(order.id, 'Completed', e)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                                >
                                  <span>Mark Completed</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                      No order records found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Form Modal (Create / Edit Order) */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header with Template Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingOrderId ? 'Edit Order Form' : 'Create New Order'}
                </h3>

                {/* Template Selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Template:
                  </span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="">Choose Pre-built Template ▾</option>
                    {PROPOSAL_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Row 1: BDO/BDM | Proposal By | Customer Person in 3 columns */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    BDO / BDM
                  </label>
                  <input
                    type="text"
                    value={bdm}
                    onChange={(e) => setBdm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Proposal By
                  </label>
                  <input
                    type="text"
                    value={proposalBy}
                    onChange={(e) => setProposalBy(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerPerson}
                    onChange={(e) => setCustomerPerson(e.target.value)}
                    placeholder="Customer / Contact Person"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Row 2: Company | Mobile | Order Date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company Name"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={mobileNum}
                    onChange={(e) => setMobileNum(e.target.value)}
                    placeholder="9447151442"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Proposal Number &amp; Date
                  </label>
                  <input
                    type="text"
                    value={proposalNo}
                    onChange={(e) => setProposalNo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Rich Text Editor 1: Order Summary */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Order Summary
                </label>
                <div className="rounded-lg border border-slate-300 overflow-hidden bg-white shadow-2xs">
                  <ReactQuill
                    theme="snow"
                    className="quill-tall"
                    value={orderSummaryHtml}
                    onChange={setOrderSummaryHtml}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Enter order summary, domain/server registration, and key deliverables..."
                  />
                </div>
              </div>

              {/* Rich Text Editor 2: Order in Details */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Order in Details &amp; Specifications
                </label>
                <div className="rounded-lg border border-slate-300 overflow-hidden bg-white shadow-2xs">
                  <ReactQuill
                    theme="snow"
                    className="quill-tall"
                    value={orderInDetailsHtml}
                    onChange={setOrderInDetailsHtml}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Enter full technical specifications, deliverable pricing, and recurring charges..."
                  />
                </div>
              </div>

              {/* Financial Breakdown Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Total Amount (₹)
                  </label>
                  <input
                    type="text"
                    value={totalVal}
                    onChange={(e) => setTotalVal(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="text"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Net Payable (₹)
                  </label>
                  <input
                    type="text"
                    value={netVal}
                    onChange={(e) => setNetVal(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-emerald-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Bank Details Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bank Branch &amp; Address
                  </label>
                  <input
                    type="text"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Internal Remarks &amp; Token Advance Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50% advance token received via UPI / Cheque..."
                  value={remarksVal}
                  onChange={(e) => setRemarksVal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {submitMessage && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-700 text-center animate-in fade-in">
                  {submitMessage}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs active:scale-98"
                >
                  Save &amp; Generate Order Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
