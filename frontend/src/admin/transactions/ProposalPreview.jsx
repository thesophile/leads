import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import { can } from '../../utils/permissions'
import usePagedContent from '../../utils/usePagedContent'
import PagedSection from '../../utils/PagedSection'

function wrappableHtml(html) {
  return String(html || '').replace(/&nbsp;/gi, ' ')
}

// Initial Proposal Model matching exact PDF document
const DEFAULT_PROPOSAL = {
  id: 'QTN403206072026A',
  orderDate: '06-07-2026',
  customerCompany: 'TEST COMPANY141',
  customerPerson: 'TEST PERSON',
  customerPhone: '9541258742',
  customerLocation: 'TEST LOCATION',
  bdm: 'Husna',
  quotationBy: 'Bincy',
  revisionNo: 'QTN403206072026A (Revised #14)',
  category: 'CLINIC',
  customerType: '',
  sources: 'test source',
  termsConditions: [
    {
      title: '1. Payment Terms:',
      content:
        '50% non-refundable advance is required on signing. Remaining 50% must be paid before hosting, deployment, or handover. Payments via Bank Transfer or UPI only. Prices exclude GST. Delays over 7 days after completion may incur a 5% weekly late fee and withholding of launch. All fees paid are non-refundable.',
    },
    {
      title: '2. Renewals:',
      content:
        'Yearly hosting and domain fees will be charged as per the Order Form and may change with prior notice. Service period starts from domain registration date, regardless of launch. Renewal fees for Domain, SSL, and Server Space must be paid at least 30 days before expiry.',
    },
    {
      title: '3. Support:',
      content:
        'Provided via Email/WhatsApp, 10 AM–5 PM, Mon–Sat (excluding holidays). Covers bug fixes and server uptime only; no new features, design, or content updates without an AMC. After warranty, support requires a valid AMC or is charged hourly.',
    },
  ],
  proposalSummaryHtml: `
    <p><strong>Greetings from PROGRAMERS INTERNATIONAL,</strong></p>
    <p>Dear Sir/Madam,</p>
    <p>We are pleased to submit our formal commercial proposal for the end-to-end design, custom development, and cloud deployment of your <strong>Enterprise Web Platform & Business Management Suite</strong>. Our solution is engineered to automate your operational workflow, accelerate client conversions, and provide robust cloud scalability.</p>
    <br/>
    <p><strong>Key Project Deliverables:</strong></p>
    <p>• <strong>Custom Web Platform:</strong> Modern, high-performance UI/UX optimized for all mobile, tablet, and desktop viewports.<br/>
       • <strong>Operational CRM & Lead Engine:</strong> Real-time customer inquiry capture, automated WhatsApp/SMS notifications, and follow-up tracking.<br/>
       • <strong>Integrated Billing & Tax Engine:</strong> GST-compliant quotation generation, proforma invoicing, and accounting integration.<br/>
       • <strong>Cloud Hosting & Domain Setup:</strong> High-speed SSL-secured cloud server deployment with 99.9% uptime SLA.</p>
    <br/>
    <p><strong>Commercial Representative:</strong><br/>
       <strong>Husna M S</strong> — Senior Business Development Manager<br/>
       Phone: +91 9447151442 | Email: husna@programers.in<br/>
       Programers International, Thrissur, Kerala
    </p>
  `,
  proposalInDetailsHtml: `
    <h4 style="font-weight:bold; font-size:13px; color:#0f172a; margin-bottom:6px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
      1. TECHNICAL ARCHITECTURE & MODULE BREAKDOWN
    </h4>
    <div style="margin-bottom:12px; line-height:1.6;">
      <p><strong>A. Responsive User Experience & Frontend Interface (UI/UX)</strong></p>
      <p style="color:#334155;">Constructed with a modern Single-Page Application (SPA) architecture guaranteeing sub-second load times, cross-browser compatibility, and adherence to international WCAG accessibility guidelines.</p>
      
      <p style="margin-top:6px;"><strong>B. Operational Command Center & Staff CRM</strong></p>
      <p style="color:#334155;">Multi-tier role-based access control (Super Admin, Branch Managers, Sales/Telecalling Staff), centralized lead lifecycle pipeline, and real-time operational analytics dashboard.</p>
      
      <p style="margin-top:6px;"><strong>C. Cloud Infrastructure & Security Hardening</strong></p>
      <p style="color:#334155;">256-bit TLS enterprise encryption, automated daily offsite database snapshots, Web Application Firewall (WAF), and DDoS mitigation protocols.</p>
    </div>

    <h4 style="font-weight:bold; font-size:13px; color:#0f172a; margin-top:14px; margin-bottom:6px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
      2. IMPLEMENTATION PHASES & DELIVERY ROADMAP
    </h4>
    <div style="line-height:1.6;">
      <p><strong>• Phase 1 — Discovery & UI Wireframing (Week 1):</strong> Formal requirement sign-off, system workflow mapping, and prototype approval.</p>
      <p><strong>• Phase 2 — Core Engine & Integration (Weeks 2–3):</strong> Database modeling, API integrations, business logic implementation, and security hardening.</p>
      <p><strong>• Phase 3 — Quality Assurance & Go-Live (Week 4):</strong> End-to-end stress testing, user acceptance testing (UAT), production cloud deployment, and staff training.</p>
    </div>
  `,
  proposalDetailsContinuedHtml: `
    <h4 style="font-weight:bold; font-size:13px; color:#0f172a; margin-bottom:6px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
      3. SERVICE LEVEL AGREEMENT (SLA) & WARRANTY SUPPORT
    </h4>
    <div style="margin-bottom:14px; line-height:1.6;">
      <p><strong>A. 12-Month Comprehensive Technical Warranty</strong></p>
      <p style="color:#334155;">Includes full resolution of system anomalies, framework security updates, performance tuning, and 99.9% server uptime monitoring with zero additional labor charges during the warranty term.</p>
      
      <p style="margin-top:6px;"><strong>B. Priority Support Desk & SLA Response Times</strong></p>
      <p style="color:#334155;">Multi-channel technical assistance provided via Helpdesk Portal, WhatsApp Priority Channel, and Phone (Mon–Sat, 9:30 AM – 6:00 PM IST) with guaranteed 2-hour response for critical priority tickets.</p>
      
      <p style="margin-top:6px;"><strong>C. Intellectual Property & Data Ownership</strong></p>
      <p style="color:#334155;">Upon completion of final milestone payments, the client retains 100% exclusive ownership of all organizational data and operational rights under standard non-disclosure terms.</p>
    </div>
  `,
  total: '26,000/-',
  discount: '1,000.00/-',
  net: '25,000.00/-',
  amountWords: 'Twenty-five Thousand Only',
  status: 'Quotation Requested',
}

const CLIENT_ACCEPTANCE_HTML = `
  <div style="border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; padding:12px; margin-top:16px;">
    <p style="font-weight:bold; font-size:11px; color:#0f172a; text-transform:uppercase;">Client Acceptance & Project Commissioning</p>
    <p style="font-size:10.5px; color:#475569; margin-top:4px;">By signing or issuing an official Purchase Order referencing this Proposal, the client confirms acceptance of the scope of work, financial terms, and service conditions outlined herein.</p>
    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:24px; padding-top:12px; border-top:1px solid #cbd5e1;">
      <div>
        <div style="width:140px; border-bottom:1px solid #475569; height:20px;"></div>
        <p style="font-size:10px; font-weight:bold; color:#0f172a; margin-top:4px;">Authorized Client Signature</p>
        <p style="font-size:9px; color:#64748b;">(Name, Designation & Seal)</p>
      </div>
      <div style="text-align:right;">
        <div style="width:140px; border-bottom:1px solid #475569; height:20px; margin-left:auto;"></div>
        <p style="font-size:10px; font-weight:bold; color:#0f172a; margin-top:4px;">For Programers International</p>
        <p style="font-size:9px; color:#64748b;">Authorized Signatory</p>
      </div>
    </div>
  </div>
`

// NPM Generated Crisp QR Code Component
function QRCodeVisual({ value = `https://leads.programersapps.com/quotation/proposalform/${DEFAULT_PROPOSAL.id}` }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white p-0.5">
      <QRCodeSVG
        value={value}
        size={84}
        level="H"
        fgColor="#000000"
        bgColor="#ffffff"
        className="h-full w-full"
      />
    </div>
  )
}

// Company Logo Component (tenant-driven)
function ProgramersLogo({ logo, companyName }) {
  return (
    <div className="flex flex-col items-end">
      {logo ? (
        <img
          src={logo}
          alt={companyName || 'Company logo'}
          className="h-10 w-auto max-w-[200px] object-contain"
        />
      ) : (
        <span className="text-right text-[12px] font-black uppercase tracking-wider text-slate-800">
          {companyName || 'Company'}
        </span>
      )}
    </div>
  )
}

// GeM Badge
function GeMBadge() {
  return (
    <div className="flex flex-col items-center">
      <img
        src="/GeM.png"
        alt="GeM - Government e Marketplace"
        className="h-10 w-auto object-contain"
      />
    </div>
  )
}

// NPM Generated Barcode Component
function BarcodeVisual({ code = DEFAULT_PROPOSAL.id }) {
  return (
    <div className="flex flex-col items-end overflow-hidden">
      <Barcode
        value={code.replace(/\s+/g, '')}
        width={1.85}
        height={32}
        format="CODE128"
        displayValue={true}
        font="monospace"
        fontSize={12}
        textMargin={2}
        margin={0}
        background="transparent"
        lineColor="#000000"
      />
    </div>
  )
}

// Digital Signature Stamp (Compact Monochrome Seal)
function SignatureStamp({ bdm = 'Husna M S' }) {
  return (
    <div className="relative inline-flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border border-slate-400 bg-slate-50/80 p-1 text-slate-800">
      <div className="absolute inset-0.5 rounded-full border border-dashed border-slate-400" />
      <span className="text-[7px] font-extrabold uppercase leading-none text-slate-900">VERIFIED</span>
      <span className="text-[6.5px] font-bold leading-none text-black mt-0.5 truncate max-w-[52px]">{bdm}</span>
      <span className="text-[6px] text-slate-500 font-mono leading-none mt-0.5">Thrissur</span>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Reusable document primitives
function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 font-mono text-[13px] font-bold text-slate-900">{value}</p>
    </div>
  )
}

function SectionBox({ title, children, className = '', overflowVisible = false }) {
  return (
    <div
      className={`${overflowVisible ? 'overflow-visible' : 'overflow-hidden'} rounded-xl border border-slate-300 ${className}`}
    >
      <div className="flex items-center justify-between bg-black px-3 py-2">
        <span className="text-[13px] font-bold uppercase tracking-wider text-white">{title}</span>
      </div>
      <div className="p-3.5 bg-white">{children}</div>
    </div>
  )
}

function PageHeader({ proposal, annexLabel, company }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-4">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 rounded-lg border border-slate-300 bg-white p-1">
          <QRCodeVisual value={`https://leads.programersapps.com/quotation/proposalform/${proposal.id}`} />
        </div>
        <div className="space-y-2.5">
          <InfoBlock label="Quotation #" value={proposal.id} />
          <InfoBlock label="Order Date" value={proposal.orderDate} />
          {annexLabel && <InfoBlock label="Annexure" value={annexLabel} />}
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-[24px] font-black uppercase tracking-[0.1em] text-black">
          Proposal Form
        </h2>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {company?.name || 'Company'}
        </p>
        <div className="mt-1.5 flex justify-center">
          <GeMBadge />
        </div>
      </div>

      <div className="flex flex-col items-end space-y-2 text-right">
        <ProgramersLogo logo={company?.logo} companyName={company?.name} />
        <BarcodeVisual code={proposal.id} />
        <p className="font-mono text-[9.5px] text-slate-600">
          {proposal.id} | {proposal.orderDate} | {proposal.quotationBy}
        </p>
      </div>
    </div>
  )
}

function PageFooter({ company }) {
  const parts = []
  if (company?.address) parts.push(company.address)
  if (company?.email) parts.push(company.email)
  if (company?.website) parts.push(company.website)
  if (company?.phone) parts.push(`Ph: ${company.phone}`)
  const text = parts.join(' | ')
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-[11px] leading-relaxed text-slate-600">
      {text || (company?.name ? `${company.name} — set your address &amp; contact details in Settings` : '')}
    </div>
  )
}

const ONES = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
const BIG = [
  { value: 10000000, word: 'Crore' },
  { value: 100000, word: 'Lakh' },
  { value: 1000, word: 'Thousand' },
  { value: 100, word: 'Hundred' },
]

function twoDigitWords(n) {
  if (n < 20) return ONES[n]
  const ten = Math.floor(n / 10)
  const one = n % 10
  return TENS[ten] + (one ? ` ${ONES[one]}` : '')
}

function threeDigitWords(n) {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  let out = ''
  if (hundred) out += `${ONES[hundred]} Hundred`
  if (rest) out += (out ? ' ' : '') + twoDigitWords(rest)
  return out
}

function numToIndianWords(num) {
  if (!Number.isFinite(num) || num < 0) return ''
  let integer = Math.floor(num)
  if (integer === 0) return 'Zero'
  let chunks = []
  for (const { value, word } of BIG) {
    if (value === 100) break
    if (integer >= value) {
      chunks.push(`${twoDigitWords(Math.floor(integer / value))} ${word}`)
      integer %= value
    }
  }
  if (integer > 0) chunks.push(threeDigitWords(integer))
  return chunks.join(' ')
}

function amountWords(raw) {
  const cleaned = String(raw == null ? '' : raw).replace(/[^0-9.]/g, '')
  if (!cleaned) return ''
  const [intPart, decPart = ''] = cleaned.split('.')
  const integer = Number(intPart || 0)
  const paise = Number(decPart.padEnd(2, '0').slice(0, 2) || 0)
  let out = numToIndianWords(integer)
  if (integer === 0 && paise) out = 'Zero'
  if (paise) out += ` and ${twoDigitWords(paise)} Paise`
  return out ? `${out} Only` : ''
}

function FinancialBanner({ proposal }) {
  const words = amountWords(proposal.net) || proposal.amountWords
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300">
      <div className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-center text-[11.5px] font-bold uppercase tracking-wider text-slate-700">
        All Amt In INR | No Additional Service Or Items | E&amp;O
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-3 text-[14px] font-bold text-slate-900">
        <span>Total: {proposal.total}</span>
        <span className="text-slate-600">(Discount: {proposal.discount})</span>
        <span className="text-[16px] font-black text-black">Net: {proposal.net}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-100 px-3 py-2 text-[11.5px] font-bold text-slate-700">
        <span>{words}</span>
        <span>Annexure - A(0)</span>
      </div>
    </div>
  )
}

const PAGE_CLASS =
  'print-page mx-auto flex w-full max-w-[210mm] flex-col h-[297mm] overflow-hidden bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm'

function approvalCountBy(approvals, status) {
  return (approvals || []).filter((a) => a.status === status).length
}

export default function ProposalPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { user } = useAuth()

  const canApprove = !!user && (can(user, 'quotation.approve') || user.is_superuser)

  const [company, setCompany] = useState({})
  const [proposal, setProposal] = useState(() => location.state?.proposal || null)
  const [loadingQuote, setLoadingQuote] = useState(() => !location.state?.proposal)

  // Send-for-approval
  const [approvers, setApprovers] = useState([])
  const [sendOpen, setSendOpen] = useState(false)
  const [sendApprovers, setSendApprovers] = useState([])
  const [sending, setSending] = useState(false)
  // Approve / reject
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [approveNotice, setApproveNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get('/auth/company/')
        if (!cancelled) setCompany(data || {})
      } catch (err) {
        console.error('Failed to load company profile', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch approvers once for the send-for-approval picker.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get('/transactions/quotations/approvers/')
        if (!cancelled && Array.isArray(data)) setApprovers(data)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // If we arrived without navigation state (e.g. from a notification link),
  // fetch the quotation by id.
  useEffect(() => {
    if (proposal || !params.id) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get(`/transactions/quotations/${encodeURIComponent(params.id)}/`)
        if (!cancelled) setProposal(data || null)
      } catch (err) {
        if (!cancelled) setActionError(err.message)
      } finally {
        if (!cancelled) setLoadingQuote(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params.id, proposal])

  // Safety net: if we were handed navigation state that is missing the approver
  // list for a pending proposal, refetch the authoritative quotation once.
  useEffect(() => {
    if (params.id && !approvalRefetchedRef.current && proposal) {
      const isPending = proposal.status === 'Pending Approval'
      const hasNoApprovals = !Array.isArray(proposal.approvals) || proposal.approvals.length === 0
      if (isPending && hasNoApprovals) {
        approvalRefetchedRef.current = true
        let cancelled = false
        ;(async () => {
          try {
            const data = await api.get(`/transactions/quotations/${encodeURIComponent(params.id)}/`)
            if (!cancelled && data) setProposal(data)
          } catch {
            // ignore
          }
        })()
        return () => {
          cancelled = true
        }
      }
    }
  }, [params.id, proposal])

  const proposalData = useMemo(() => {
    if (proposal) {
      const p = proposal
      return {
        ...DEFAULT_PROPOSAL,
        id: p.id || DEFAULT_PROPOSAL.id,
        orderDate: p.date || DEFAULT_PROPOSAL.orderDate,
        customerCompany: p.company || DEFAULT_PROPOSAL.customerCompany,
        customerPerson: p.customer || DEFAULT_PROPOSAL.customerPerson,
        customerPhone: p.mobile || DEFAULT_PROPOSAL.customerPhone,
        customerLocation: p.city || DEFAULT_PROPOSAL.customerLocation,
        bdm: p.bdm || p.staff || DEFAULT_PROPOSAL.bdm,
        quotationBy: p.qtnBy || p.staff || DEFAULT_PROPOSAL.quotationBy,
        revisionNo: p.revisionNo || '',
        category: p.category || DEFAULT_PROPOSAL.category,
        customerType: p.customerType || '',
        sources: p.source || DEFAULT_PROPOSAL.sources,
        total: p.total || DEFAULT_PROPOSAL.total,
        discount: p.discount || DEFAULT_PROPOSAL.discount,
        net: p.netAmount || DEFAULT_PROPOSAL.net,
        termsHtml: p.companyTerms || '',
        proposalSummaryHtml: p.proposalScope || DEFAULT_PROPOSAL.proposalSummaryHtml,
        proposalInDetailsHtml:
          p.termsConditions ||
          DEFAULT_PROPOSAL.proposalInDetailsHtml + DEFAULT_PROPOSAL.proposalDetailsContinuedHtml,
        status: p.status || DEFAULT_PROPOSAL.status,
        leadId: p.leadId || p.id,
        approverName: p.approverName || '',
        signedBy: p.signedBy || '',
        signatureRef: p.signatureRef || '',
        approvedAt: p.approvedAt || '',
        rejectedAt: p.rejectedAt || '',
        rejectionReason: p.rejectionReason || '',
        approvals: p.approvals || [],
        approvalsTotal: p.approvalsTotal || 0,
        approvalsApproved: p.approvalsApproved || 0,
        hasProposal: true,
      }
    }
    return DEFAULT_PROPOSAL
  }, [proposal])

  const isSent = proposalData.status === 'Pending Approval'

  const myApproval = (proposalData.approvals || []).find(
    (a) => user != null && Number(a.user) === Number(user.id)
  ) || null
  const canApproveNow =
    canApprove &&
    proposalData.status === 'Pending Approval' &&
    myApproval &&
    myApproval.status === 'Pending'

  const approvals = proposalData.approvals || []
  const approvalsApproved = approvalCountBy(approvals, 'Approved')

const approvedByRef = useRef(null)
  const financialRef = useRef(null)
  const page1FooterRef = useRef(null)
  const page2FooterRef = useRef(null)
  const termsContentRef = useRef(null)
  const summaryContentRef = useRef(null)
  const detailsContentRef = useRef(null)
  const approvalRefetchedRef = useRef(false)
  const termsPaged = usePagedContent(termsContentRef, page1FooterRef, [approvedByRef], 48)
  const summaryPaged = usePagedContent(summaryContentRef, page1FooterRef, [financialRef], 44)
  const detailsPaged = usePagedContent(detailsContentRef, page2FooterRef, [], 64)


  function handlePrint() {
    window.print()
  }

  function openSend() {
    setActionError('')
    setApproveNotice('')
    setSendApprovers([])
    setSendOpen(true)
  }

  function openApprove() {
    setActionError('')
    setApproveNotice('')
    setOtp('')
    setOtpSent(false)
    setActionNote('')
    setApproveOpen(true)
  }

  function openReject() {
    setActionError('')
    setRejectReason('')
    setRejectOpen(true)
  }

  async function handleSend() {
    if (sendApprovers.length === 0) return
    setSending(true)
    setActionError('')
    try {
      const updated = await api.put(
        `/transactions/quotations/${encodeURIComponent(proposalData.id)}/`,
        { status: 'Pending Approval', approvers: sendApprovers }
      )
      setProposal(updated)
      setSendOpen(false)
      setApproveNotice('✓ Proposal sent for approval.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleRequestOtp() {
    setActionLoading(true)
    setActionError('')
    setOtpSent(false)
    try {
      await api.post(
        `/transactions/quotations/${encodeURIComponent(proposalData.id)}/approval-otp/`,
        {}
      )
      setOtpSent(true)
      setApproveNotice('A one-time approval code has been sent to your email.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleApprove() {
    setActionLoading(true)
    setActionError('')
    try {
      const updated = await api.post(
        `/transactions/quotations/${encodeURIComponent(proposalData.id)}/approve/`,
        { otp, note: actionNote }
      )
      setProposal(updated)
      setApproveOpen(false)
      setApproveNotice('✓ Proposal approved. Digital signature recorded.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    setActionLoading(true)
    setActionError('')
    try {
      const updated = await api.post(
        `/transactions/quotations/${encodeURIComponent(proposalData.id)}/reject/`,
        { reason: rejectReason }
      )
      setProposal(updated)
      setRejectOpen(false)
      setApproveNotice('✗ Proposal rejected.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loadingQuote && !proposal) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <span className="text-xs text-slate-500">Loading proposal…</span>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6 pb-16">
        {/* Top Sticky Action Bar */}
        <div className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur-md print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 cursor-pointer"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900">PROPOSAL FORM (ALL PAGES)</h1>
              <p className="font-mono text-[11px] text-slate-500">
                {proposalData.id} • {proposalData.customerCompany}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {approveNotice && (
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700">
                {approveNotice}
              </span>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-slate-900 cursor-pointer"
            >
              Print All Pages
            </button>
            {canApproveNow && (
              <>
                <button
                  type="button"
                  onClick={openReject}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-5 py-2 text-xs font-bold text-rose-600 shadow-md transition hover:bg-rose-50 cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={openApprove}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 cursor-pointer"
                >
                  ✓ Approve
                </button>
              </>
            )}
            {proposalData.status !== 'Approved' && proposalData.status !== 'Rejected' && !isSent && (
              <button
                type="button"
                onClick={openSend}
                className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer ${
                  isSent
                    ? 'cursor-not-allowed bg-emerald-600 opacity-90'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSent ? '✓ Sent for Approval' : 'Send for Approval'}
              </button>
            )}
            {isSent && proposalData.status === 'Pending Approval' && (
              <span className="rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                ⏳ Awaiting Approval — {approvalsApproved}/{approvals.length}
              </span>
            )}
          </div>
        </div>

        {/* All pages, continuous vertical scroll */}
        <div className="space-y-8 print:space-y-0">
          {/* -------------------- PAGE 1 (SUMMARY) -------------------- */}
          <div className={PAGE_CLASS}>
            <div className="flex flex-1 flex-col">
            <PageHeader proposal={proposalData} company={company} />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SectionBox title="Customer Details">
                <div className="space-y-1">
                  <p className="text-[15px] font-bold uppercase leading-snug text-slate-900">
                    {proposalData.customerCompany}
                  </p>
                  <p className="text-[13.5px] font-medium text-slate-700">
                    {proposalData.customerPerson}
                  </p>
                  <p className="font-mono text-[13px] text-slate-800">{proposalData.customerPhone}</p>
                  <p className="text-[12.5px] text-slate-500">{proposalData.customerLocation}</p>
                </div>
              </SectionBox>

              <SectionBox title="Proposal Details">
                <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-700">
                  <p>
                    <span className="font-bold text-slate-900">BDM:</span> {proposalData.bdm}
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Revision:</span>{' '}
                    {proposalData.revisionNo || '—'}
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Quotation By:</span>{' '}
                    {proposalData.quotationBy}
                  </p>
                </div>
              </SectionBox>

              <SectionBox title="Project Details">
                <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-700">
                  <p>
                    <span className="font-bold text-slate-900">Category:</span>{' '}
                    {proposalData.category}
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Customer Type:</span>{' '}
                    {proposalData.customerType || '-'}
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Sources:</span> {proposalData.sources}
                  </p>
                </div>
              </SectionBox>
            </div>

            <p className="mt-3 text-[12px] italic leading-relaxed text-slate-500">
              This Proposal form is issued in connection with the proposed project, and confirms our
              intent to proceed with the implementation as per the agreed terms and conditions.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
              <div className="flex flex-col gap-3 lg:col-span-4">
                <SectionBox title="Terms &amp; Conditions">
                  {proposalData.termsHtml ? (
                    <div
                      ref={termsContentRef}
                      className="space-y-3 text-[12.5px] leading-relaxed text-slate-700"
                      style={termsPaged.cap ? { maxHeight: termsPaged.cap, overflow: 'hidden' } : undefined}
                      dangerouslySetInnerHTML={{ __html: wrappableHtml(proposalData.termsHtml) }}
                    />
                  ) : (
                    <div className="space-y-3 text-[12.5px] leading-relaxed text-slate-700">
                      {proposalData.termsConditions.map((t, idx) => (
                        <div key={idx}>
                          <span className="font-bold text-slate-900">{t.title}</span> {t.content}
                        </div>
                      ))}
                    </div>
                  )}
                  {termsPaged.part2Html ? (
                    <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                      Continued…
                    </p>
                  ) : null}
                </SectionBox>

                <div ref={approvedByRef}>
                  <SectionBox title="Approved By">
                  {approvals.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-0.5">No approvers selected yet.</p>
                  ) : (
                    <div className="space-y-2 py-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            proposalData.status === 'Approved'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : proposalData.status === 'Rejected'
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {proposalData.status === 'Approved'
                            ? '✓ Approved'
                            : proposalData.status === 'Rejected'
                            ? '✗ Rejected'
                            : '⏳ Awaiting approval'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {approvalsApproved}/{approvals.length} approved
                        </span>
                      </div>

                      {approvals.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-slate-900 flex items-center gap-1">
                              {a.userName}
                              {a.user === user?.id && <span className="text-[9px] font-bold text-brand-600">you</span>}
                            </p>
                            {a.status === 'Approved' && (
                              <p className="text-[10px] text-slate-500 leading-tight">
                                Digitally signed (OTP) •{' '}
                                {a.signedAt ? new Date(a.signedAt).toLocaleString() : ''}
                              </p>
                            )}
                            {a.status === 'Rejected' && (
                              <p className="text-[10px] text-rose-600 leading-tight">
                                Rejected: {a.rejectionReason || 'No reason recorded.'}
                              </p>
                            )}
                            {a.status === 'Pending' && (
                              <p className="text-[10px] text-amber-600 leading-tight">Awaiting this approver</p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              a.status === 'Approved'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : a.status === 'Rejected'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>
                      ))}

                      {proposalData.status === 'Approved' && (
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="space-y-0.5 text-left min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-slate-900 flex items-center gap-1">
                              <span className="text-emerald-700 font-extrabold">✓</span> All signatures valid (OTP verified)
                            </p>
                            {proposalData.signatureRef && (
                              <p className="font-mono text-[10px] text-slate-500">Ref: {proposalData.signatureRef}</p>
                            )}
                          </div>
                          <SignatureStamp bdm={proposalData.signedBy || 'Approved'} />
                        </div>
                      )}
                    </div>
                  )}
                </SectionBox>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-8">
                <SectionBox title="Proposal Summary">
                  <div
                    ref={summaryContentRef}
                    className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-800"
                    style={summaryPaged.cap ? { maxHeight: summaryPaged.cap, overflow: 'hidden' } : undefined}
                    dangerouslySetInnerHTML={{ __html: wrappableHtml(proposalData.proposalSummaryHtml) }}
                  />
                  {summaryPaged.part2Html ? (
                    <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                      Continued…
                    </p>
                  ) : null}
                </SectionBox>

                <div ref={financialRef}>
                  <FinancialBanner proposal={proposalData} />
                </div>
              </div>
            </div>

            <div ref={page1FooterRef} className="mt-auto pt-4">
              <PageFooter company={company} />
            </div>
            </div>
          </div>

          {/* -------------------- PAGE 2 (ANNEXURE A - 1/1) -------------------- */}
          <div className={PAGE_CLASS}>
            <div className="flex flex-1 flex-col">
            <PageHeader proposal={proposalData} annexLabel="ANNEXURE - A (1/1)" company={company} />

            <div className="mt-4 flex flex-1 flex-col">
              <SectionBox title="Proposal in Details &amp; Specifications" className="flex-1">
                <div className="flex h-full flex-1 flex-col justify-between">
                  <div
                    ref={detailsContentRef}
                    className="space-y-3 text-[13px] leading-relaxed text-slate-800"
                    style={detailsPaged.cap ? { maxHeight: detailsPaged.cap, overflow: 'hidden' } : undefined}
                    dangerouslySetInnerHTML={{ __html: wrappableHtml(proposalData.proposalInDetailsHtml) }}
                  />
                  <div dangerouslySetInnerHTML={{ __html: CLIENT_ACCEPTANCE_HTML }} />
                  {detailsPaged.part2Html ? (
                    <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                      Continued…
                    </p>
                  ) : null}
                  <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                    --- End of proposal ---
                  </p>
                </div>
              </SectionBox>
            </div>

            <div ref={page2FooterRef} className="mt-auto pt-4">
              <PageFooter company={company} />
            </div>
            </div>
          </div>

          {/* -------------------- PAGE 3 (SUMMARY CONTINUED) -------------------- */}
          {summaryPaged.part2Html && (
            <PagedSection
              html={wrappableHtml(summaryPaged.part2Html)}
              reserve={44}
              contentClass="space-y-1.5 text-[13.5px] leading-relaxed text-slate-800"
              sectionTitle="Proposal Summary (Continued)"
              boxClass="rounded-xl border border-slate-300 bg-white"
              titleClass="text-left"
              pageHeader={
                <PageHeader proposal={proposalData} annexLabel="ANNEXURE - A (1/2)" company={company} />
              }
              pageFooter={<PageFooter company={company} />}
            />
          )}

          {/* -------------------- PAGE 3 (PROPOSAL IN DETAILS CONTINUED) -------------------- */}
          {detailsPaged.part2Html && (
            <PagedSection
              html={wrappableHtml(detailsPaged.part2Html)}
              reserve={64}
              contentClass="space-y-3 text-[13px] leading-relaxed text-slate-800"
              sectionTitle="Proposal in Details &amp; Specifications (Continued)"
              boxClass="rounded-xl border border-slate-300 bg-white"
              titleClass="text-left"
              pageHeader={
                <PageHeader proposal={proposalData} annexLabel="ANNEXURE - A (2/2)" company={company} />
              }
              pageFooter={<PageFooter company={company} />}
            />
          )}

          {/* -------------------- LAST PAGE (TERMS & CONDITIONS CONTINUED) -------------------- */}
          {termsPaged.part2Html && (
            <PagedSection
              html={wrappableHtml(termsPaged.part2Html)}
              reserve={48}
              contentClass="space-y-3 text-[12.5px] leading-relaxed text-slate-700"
              sectionTitle="Terms &amp; Conditions (Continued)"
              boxClass="rounded-xl border border-slate-300 bg-white"
              titleClass="text-left"
              pageHeader={
                <PageHeader proposal={proposalData} annexLabel="ANNEXURE - A (3/2)" company={company} />
              }
              pageFooter={<PageFooter company={company} />}
            />
          )}
        </div>
      </div>

      {actionError && (
        <div className="fixed top-4 left-1/2 z-[95] -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 shadow-lg">
          {actionError}
        </div>
      )}

      {/* Send for Approval */}
      {sendOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !sending) setSendOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  ✈
                </span>
                <h3 className="text-sm font-bold text-slate-900">Send for Approval</h3>
              </div>
              <button
                type="button"
                onClick={() => setSendOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[11px] text-slate-500">
                Send <span className="font-bold text-slate-700">{proposalData.id}</span> for {proposalData.customerCompany} to approvers.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Select Approving Admins <span className="text-rose-500">*</span>
                </label>
                <div className="rounded-lg border border-slate-300 bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {approvers.length === 0 && (
                    <p className="px-3 py-2.5 text-[11px] text-slate-400">No approvers available.</p>
                  )}
                  {approvers.map((a) => {
                    const checked = sendApprovers.includes(a.id)
                    return (
                      <label
                        key={a.id}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSendApprovers((prev) =>
                              prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-slate-800 truncate">{a.name}</span>
                          <span className="block text-[10px] text-slate-400">
                            {a.role ? a.role : 'Approver'}
                          </span>
                        </span>
                        {checked && (
                          <span className="text-[10px] font-bold text-emerald-600">✓ Selected</span>
                        )}
                      </label>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-[10.5px] text-slate-400 leading-relaxed">
                  Every selected admin must approve this proposal before it is sent to the client.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setSendOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sendApprovers.length === 0 || sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve (OTP) */}
      {approveOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setApproveOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">✓</span>
                <h3 className="text-sm font-bold text-slate-900">Approve Proposal</h3>
              </div>
              <button
                type="button"
                onClick={() => !actionLoading && setApproveOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <p className="font-mono text-[10px] font-bold text-brand-600 uppercase tracking-wider">{proposalData.id}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">{proposalData.customerCompany}</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {proposalData.customerPerson} • Net {proposalData.net}
                </p>
              </div>

              {otpSent && approveNotice && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-700 text-center animate-in fade-in">
                  {approveNotice}
                </div>
              )}

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={actionLoading}
                  className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-900 transition cursor-pointer disabled:opacity-60"
                >
                  {actionLoading ? 'Sending code…' : 'Send one-time code'}
                </button>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Approval Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter the 6-digit code"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center text-lg tracking-[0.4em] font-mono text-slate-900 placeholder:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <p className="mt-1.5 text-[10px] text-slate-400">The code expires in 5 minutes and can be used once.</p>
                  </div>
                  <textarea
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Approval note (optional)"
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setApproveOpen(false)}
                disabled={actionLoading}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={!otpSent || otp.length !== 6 || actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? 'Verifying…' : '✓ Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject */}
      {rejectOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setRejectOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">✗</span>
                <h3 className="text-sm font-bold text-slate-900">Reject Proposal</h3>
              </div>
              <button
                type="button"
                onClick={() => !actionLoading && setRejectOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[11px] text-slate-500">
                This will reject <span className="font-bold text-slate-700">{proposalData.id}</span> for {proposalData.customerCompany}.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  autoFocus
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  placeholder="Explain why this proposal is rejected..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                disabled={actionLoading}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting…' : '✗ Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
