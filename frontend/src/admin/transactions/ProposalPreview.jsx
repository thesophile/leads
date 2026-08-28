import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import Layout from '../../Layout/Layout'

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

// Programers Official Logo Component
function ProgramersLogo() {
  return (
    <div className="flex flex-col items-end">
      <img
        src="/programers-logo-BLACCK.png"
        alt="PROGRAMERS INTERNATIONAL"
        className="h-10 w-auto object-contain"
      />
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

// Reusable document primitives
function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 font-mono text-[13px] font-bold text-slate-900">{value}</p>
    </div>
  )
}

function SectionBox({ title, children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-300 ${className}`}>
      <div className="flex items-center justify-between bg-black px-3 py-2">
        <span className="text-[13px] font-bold uppercase tracking-wider text-white">{title}</span>
      </div>
      <div className="p-3.5 bg-white">{children}</div>
    </div>
  )
}

function PageHeader({ proposal, annexLabel }) {
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
          Programers International
        </p>
        <div className="mt-1.5 flex justify-center">
          <GeMBadge />
        </div>
      </div>

      <div className="flex flex-col items-end space-y-2 text-right">
        <ProgramersLogo />
        <BarcodeVisual code={proposal.id} />
        <p className="font-mono text-[9.5px] text-slate-600">
          {proposal.id} | {proposal.orderDate} | {proposal.quotationBy}
        </p>
      </div>
    </div>
  )
}

function PageFooter() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-[11px] leading-relaxed text-slate-600">
      4th Floor, Park House, Round North, Thrissur, Kerala, India - 680 001 | info@programers.in,
      www.programers.in | Ph: 9447151442, 9495951442, 9446451442
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
  'print-page mx-auto flex w-full max-w-[210mm] flex-col min-h-[297mm] bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm'

export default function ProposalPreview() {
  const navigate = useNavigate()
  const location = useLocation()

  const proposalData = useMemo(() => {
    if (location.state?.proposal) {
      const p = location.state.proposal
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
      }
    }
    return DEFAULT_PROPOSAL
  }, [location.state])

  const [isSent, setIsSent] = useState(proposalData.status === 'Pending Approval')

  function handlePrint() {
    window.print()
  }

  function handleSendForApproval() {
    setIsSent(true)
    alert('Proposal has been successfully submitted for Management Approval!')
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
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-slate-900 cursor-pointer"
            >
              Print All Pages
            </button>
            <button
              type="button"
              onClick={handleSendForApproval}
              disabled={isSent}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer ${
                isSent
                  ? 'cursor-not-allowed bg-emerald-600 opacity-90'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSent ? '✓ Sent for Approval' : 'Send for Approval'}
            </button>
          </div>
        </div>

        {/* All pages, continuous vertical scroll */}
        <div className="space-y-8 print:space-y-0">
          {/* -------------------- PAGE 1 (SUMMARY) -------------------- */}
          <div className={PAGE_CLASS}>
            <div className="flex flex-1 flex-col">
            <PageHeader proposal={proposalData} />

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

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="flex flex-col gap-3 lg:col-span-4">
                <SectionBox title="Terms & Conditions" className="flex-1">
                  {proposalData.termsHtml ? (
                    <div
                      className="space-y-3 text-[12.5px] leading-relaxed text-slate-700"
                      dangerouslySetInnerHTML={{ __html: proposalData.termsHtml }}
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
                </SectionBox>

                <SectionBox title="Approved By">
                  <div className="flex items-center justify-between gap-2 py-0.5">
                    <div className="space-y-0.5 text-left min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-900 flex items-center gap-1">
                        <span className="text-emerald-700 font-extrabold">✓</span> Signature valid
                      </p>
                      <p className="text-[11px] text-slate-700 leading-tight">
                        Digitally signed by <span className="font-bold text-black">{proposalData.bdm}</span>
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 leading-none">
                        Date: 2026.04.17 16:31:09 +00:00
                      </p>
                      <p className="text-[10px] text-slate-500 leading-none">Location: Thrissur</p>
                    </div>
                    <SignatureStamp bdm={proposalData.bdm} />
                  </div>
                </SectionBox>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-8">
                <SectionBox title="Proposal Summary" className="flex-1">
                  <div
                    className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-800"
                    dangerouslySetInnerHTML={{ __html: proposalData.proposalSummaryHtml }}
                  />
                  <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                    Continued…
                  </p>
                </SectionBox>

                <FinancialBanner proposal={proposalData} />
              </div>
            </div>

            <div className="mt-auto pt-4">
              <PageFooter />
            </div>
            </div>
          </div>

          {/* -------------------- PAGE 2 (ANNEXURE A - 1/1) -------------------- */}
          <div className={PAGE_CLASS}>
            <div className="flex flex-1 flex-col">
            <PageHeader proposal={proposalData} annexLabel="ANNEXURE - A (1/1)" />

            <div className="mt-4 flex flex-1 flex-col">
              <SectionBox title="Proposal in Details &amp; Specifications" className="flex-1">
                <div className="flex h-full flex-1 flex-col justify-between">
                  <div
                    className="space-y-3 text-[13px] leading-relaxed text-slate-800"
                    dangerouslySetInnerHTML={{ __html: proposalData.proposalInDetailsHtml }}
                  />
                  <div dangerouslySetInnerHTML={{ __html: CLIENT_ACCEPTANCE_HTML }} />
                  <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                    --- End of proposal ---
                  </p>
                </div>
              </SectionBox>
            </div>

            <div className="mt-auto pt-4">
              <PageFooter />
            </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
