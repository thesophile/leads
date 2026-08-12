import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import Layout from '../../Layout/Layout'

const DEFAULT_ORDER = {
  id: 'P2025-0004',
  orderDate: '12-12-2024',
  proposalNo: 'P2026-0004',
  proposalDate: '25-06-2026',
  customerPerson: 'Karthika Nambeesan',
  customerCompany: 'NAMBEESANS LAKSHMI LODGE',
  customerPhone: '9447151442',
  customerLocation: 'Thriprayar, Thrissur, Kerala',
  bdm: 'Husna',
  proposalBy: 'Bincy',
  orderSummaryHtml: `
    <p>To,</p>
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
       * Facilities</p>
  `,
  termsSummaryHtml: `
    <p><strong>1. Payment Terms:</strong> 50% non-refundable advance is required on signing. Remaining 50% must be paid before hosting, deployment, or handover. Payments via Bank Transfer or UPI only. Prices exclude GST. Delays over 7 days after completion may incur a 5% weekly late fee and withholding of launch. All fees paid are non-refundable.</p>
    <p><strong>2. Renewals:</strong> Yearly hosting and domain fees will be charged as per the Order Form and may change with prior notice. Service period starts from domain registration date, regardless of launch. Renewal fees for Domain, SSL, and Server Space must be paid at least 30 days before expiry.</p>
    <p><strong>3. Support:</strong> Provided via Email/WhatsApp, 10 AM–5 PM, Mon–Sat (excluding holidays). Covers bug fixes and server uptime only; no new features, design, or content updates without an AMC. After warranty, support requires a valid AMC or is charged hourly.</p>
  `,
  orderInDetailsHtml: `
    <p>* Gallery<br/>
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
    <p><strong>Monthly Charge: ₹5,000/month</strong></p>
    <br/>
    <p><strong>Terms &amp; Conditions:</strong> Continuous operational support with dedicated account manager.</p>
  `,
  legalTermsHtml: `
    <p><strong>1. Payments &amp; Commercials: Payment Schedule:</strong> A non-refundable advance payment of 50% of the total project value must be made upon signing the contract/order form. The remaining 50% balance must be cleared in full before the final hosting, server deployment, or handover of the product. <strong>Mode of Payment:</strong> All payments must be made via Bank Transfer or UPI. <strong>Taxes:</strong> All mentioned prices are exclusive of applicable taxes (GST) unless specified otherwise. <strong>Delay in Payment:</strong> If the final payment is delayed by more than 7 days after the project completion notification, Programers International reserves the right to withhold the launch/handover and charge a late fee of 5% per week on the outstanding amount. <strong>No Refunds:</strong> Fees once paid (including advance payments and domain registration fees) are non-refundable.</p>

    <p><strong>2. Renewals (Hosting &amp; Domain): Billing Cycle:</strong> Yearly renewal fees (Yearly Rent) will be charged as per the rates mentioned in the Order Form. Rates are subject to revision with prior notice. <strong>Service Period:</strong> The service period for server space and domain validity commences from the date of domain registration, regardless of the actual website launch or hosting date. <strong>Payment Deadline:</strong> Renewal charges (covering Domain, SSL, and Server Space) must be paid at least 30 days prior to the expiry date. <strong>Lapse of Service:</strong> Programers International is not responsible for the loss of any domain name, email data, or website content if the renewal payment is not made within the stipulated time. Restoration of expired domains (if possible) may incur high redemption fees payable by the Client.</p>

    <p><strong>3. Support &amp; Maintenance: Channels &amp; Hours:</strong> Support is provided via Email and WhatsApp for troubleshooting software/web issues. Support hours are 10:00 AM to 5:00 PM, Monday through Saturday (excluding public holidays). <strong>Scope of Support:</strong> Support covers bug fixes and server uptime issues only. It does not cover feature additions, design changes, or content updates unless a separate Annual Maintenance Contract (AMC) is signed. <strong>AMC Requirement:</strong> Post-warranty support is strictly subject to a valid ALC/AMC (Annual Maintenance Contract). Without an AMC, support will be charged on an hourly basis.</p>

    <p><strong>4. Scope of Work &amp; Variations: Project Scope:</strong> The project will be executed strictly according to the feature list/sitemap approved in the initial agreement. <strong>Change Requests:</strong> Any additions, changes to the design, or new feature requests made after the project has commenced will be considered "Out of Scope" and will be billed additionally. <strong>Client Deliverables:</strong> The Client must provide all necessary content (text, images, logos) within the agreed timeframe. Delays in providing content will result in a delay in the project delivery date, for which the Company is not liable.</p>

    <p><strong>5. Intellectual Property &amp; Ownership: Ownership:</strong> Full ownership of the final website/software code is transferred to the Client only upon the full realization of all pending payments. Until then, the code remains the property of Programers International. <strong>Company Rights:</strong> Programers International reserves the right to place a small credit link ("Designed/Developed by Programers International") in the footer of the website unless explicitly negotiated otherwise. <strong>Source Code:</strong> Unless specifically mentioned in the Order Form, the "Source Code" for proprietary software products belongs to Programers International; the Client is granted a license to use it.</p>

    <p><strong>6. Client Responsibilities &amp; Content Liability: Legality:</strong> The Client is solely responsible for the content (text, images, media) hosted on the website. Programers International is not liable for any copyright infringement, trademark violations, or illegal content posted by the Client. <strong>Prohibited Use:</strong> The Client shall not use the server for spamming, hosting malicious software, or illegal activities. Such actions will result in immediate termination of services without refund.</p>

    <p><strong>7. Limitation of Liability: Data Loss:</strong> While the Company takes standard measures to ensure server stability, Programers International shall not be held liable for any data loss, database corruption, or business loss due to hacking, server failure, or unforeseen technical issues. The Client is advised to maintain their own local backups. <strong>Maximum Liability:</strong> In any event, the Company's total liability shall be limited to the value of the specific service fee paid by the Client for that month/year.</p>

    <p><strong>8. Termination:</strong> Programers International reserves the right to terminate the contract and suspend services immediately if the Client breaches these terms, fails to make payments, or engages in abusive behavior towards the Company's staff.</p>

    <p><strong>9. Jurisdiction:</strong> Any disputes arising out of this agreement shall be subject to the exclusive jurisdiction of the courts located in the city of Thrissur, Kerala, India where the Programers International's registered office is situated.</p>
  `,
  total: '50000/-',
  discount: '5000/-',
  net: '45,000.00/-',
  amountWords: 'FORTY-FIVE THOUSAND ONLY',
  bankName: 'ICICI BANK',
  bankBranch: 'OPP BISHOP PALACE , EAST FORT TRICHUR. Pin : 680005',
  status: 'Order Created',
}

function QRCodeVisual({ value }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white p-0.5">
      <QRCodeSVG
        value={value || 'https://leads.programersapps.com/orders/verify/P2025-0004'}
        size={84}
        level="H"
        fgColor="#000000"
        bgColor="#ffffff"
        className="h-full w-full"
      />
    </div>
  )
}

function ProgramersLogo() {
  return (
    <div className="flex flex-col items-start">
      <img
        src="/programers-logo-BLACCK.png"
        alt="PROGRAMERS INTERNATIONAL"
        className="h-9 w-auto object-contain"
      />
    </div>
  )
}

function PageHeader({ order, annexLabel }) {
  return (
    <div className="flex items-start justify-between border-b-2 border-black pb-2">
      {/* Left: Programers Logo & Barcode */}
      <div className="flex flex-col items-start">
        <ProgramersLogo />
        <div className="pt-0.5">
          <Barcode
            value="6780611629"
            format="CODE128"
            width={1.8}
            height={26}
            displayValue={true}
            fontSize={11}
            margin={0}
            background="transparent"
          />
        </div>
      </div>

      {/* Center: ORDER FORM & GeM Logo */}
      <div className="flex flex-col items-center justify-center pt-0.5 text-center">
        <h2 className="text-3xl font-black tracking-widest text-black uppercase font-sans">
          ORDER FORM
        </h2>
        {/* Ornamental Ribbon */}
        <div className="text-slate-600 text-sm tracking-widest leading-none my-0.5 select-none">
          ୨୧┈┈┈┈୨୧
        </div>
        <img
          src="/GeM.png"
          alt="GeM - Government e Marketplace"
          className="h-10 w-auto object-contain mt-0.5"
        />
      </div>

      {/* Right: Order #, Date, QR Code & Annexure */}
      <div className="flex items-start gap-2">
        <div className="text-right">
          <div className="rounded border border-black bg-black px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
            ORDER #
          </div>
          <div className="mt-1 text-[13px] font-black tracking-wide text-black font-mono">
            {order.id}
          </div>
          <div className="mt-1.5 rounded border border-black bg-black px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
            ORDER DATE
          </div>
          <div className="mt-1 text-[13px] font-bold text-black font-mono">
            {order.orderDate}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="h-16 w-16 overflow-hidden rounded border border-black bg-white p-0.5">
            <QRCodeVisual value={`https://leads.programersapps.com/orders/${order.id}`} />
          </div>
          <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-black">
            {annexLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

function SectionBox({ title, children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-md border border-black bg-white flex flex-col ${className}`}>
      <div className="border-b border-black bg-black px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider text-white text-center shrink-0">
        {title}
      </div>
      <div className="p-3.5 text-[13px] leading-relaxed text-black flex-1 flex flex-col justify-start">
        {children}
      </div>
    </div>
  )
}

function FinancialBanner({ order }) {
  return (
    <div className="rounded-md border border-black bg-white p-2 text-black mt-1.5 shrink-0">
      <div className="border-b border-slate-300 pb-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-black">
        All Amt In | No Additional Service Or Items | E&amp;O
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1 px-1 text-[13px]">
        <div className="font-bold">
          Total: <span className="font-mono text-black">{order.total}</span>
        </div>
        <div className="font-bold text-slate-700 text-[12px]">
          (Discount: <span className="font-mono text-black">{order.discount}</span>)
        </div>
        <div className="rounded bg-black px-3 py-0.5 text-[13px] font-black text-white">
          Net: <span className="font-mono">{order.net}</span>
        </div>
      </div>
      <div className="mt-1.5 border-t border-slate-300 pt-1 text-center text-[12px] font-black uppercase tracking-widest text-black">
        {order.amountWords}
      </div>
    </div>
  )
}

function PageFooter() {
  return (
    <div className="border-t border-black pt-1.5 text-center text-[10.5px] leading-tight text-slate-800 shrink-0">
      <p className="font-medium">
        4th Floor, Park House ,Round North, Thrissur, Kerala, India - 680 001 | info@programers.in, www.programers.in | Ph: 9447151442, 9495951442, 9446451442
      </p>
      <p className="text-[9.5px] text-slate-500 mt-0.5">
        Purchase authorization request
      </p>
    </div>
  )
}

export default function OrderPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [orderData, setOrderData] = useState(() => {
    if (location.state?.order) {
      const o = location.state.order
      return {
        ...DEFAULT_ORDER,
        id: o.id || DEFAULT_ORDER.id,
        orderDate: o.date || DEFAULT_ORDER.orderDate,
        proposalNo: o.proposalNo || DEFAULT_ORDER.proposalNo,
        proposalDate: o.proposalDate || DEFAULT_ORDER.proposalDate,
        customerPerson: o.customer || DEFAULT_ORDER.customerPerson,
        customerCompany: o.company || DEFAULT_ORDER.customerCompany,
        customerPhone: o.mobile || DEFAULT_ORDER.customerPhone,
        bdm: o.bdm || DEFAULT_ORDER.bdm,
        proposalBy: o.proposalBy || DEFAULT_ORDER.proposalBy,
        total: o.total || DEFAULT_ORDER.total,
        discount: o.discount || DEFAULT_ORDER.discount,
        net: o.netAmount || DEFAULT_ORDER.net,
        orderSummaryHtml: o.scope || DEFAULT_ORDER.orderSummaryHtml,
        orderInDetailsHtml: o.details || DEFAULT_ORDER.orderInDetailsHtml,
        status: o.status || DEFAULT_ORDER.status,
      }
    }
    return DEFAULT_ORDER
  })

  return (
    <Layout>
      <div className="space-y-4">
        {/* Sticky Action Toolbar */}
        <div className="print-hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition cursor-pointer"
            >
              <span>←</span>
              <span>Back to Orders</span>
            </button>
            <span className="text-xs font-bold text-slate-900">
              Official Order Form: <span className="font-mono text-brand-700">{orderData.id}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer active:scale-95"
            >
              <span>🖨️</span>
              <span>Print Order Form</span>
            </button>

            <button
              type="button"
              onClick={() => alert(`Order Form ${orderData.id} dispatched to client via WhatsApp!`)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-95"
            >
              <span>📱</span>
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Continuous Multi-Page Document Container */}
        <div className="space-y-8 print:space-y-0">
          {/* =========================================================================
              PAGE 1: MAIN ORDER FORM (Annexure - A (2))
          ========================================================================= */}
          <div
            className="print-page mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm flex flex-col justify-between"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="flex flex-col flex-1 justify-between">
              <PageHeader order={orderData} annexLabel="Annexure - A (2)" />

              {/* 3-Column Metadata Grid */}
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <SectionBox title="CUSTOMER DETAILS">
                  <div className="space-y-1">
                    <p className="font-bold text-black text-[14px]">{orderData.customerPerson}</p>
                    <p className="text-slate-700 font-mono text-[12px]">{orderData.customerPhone}</p>
                    <p className="text-slate-600 text-[11.5px]">{orderData.customerLocation}</p>
                  </div>
                </SectionBox>

                <SectionBox title="ORDER DETAILS">
                  <div className="space-y-1">
                    <p className="font-bold text-black text-[14px]">{orderData.customerCompany}</p>
                    <p className="text-slate-700 text-[12px]">
                      Proposal Date: <span className="font-mono font-bold text-black">{orderData.proposalDate}</span>
                    </p>
                  </div>
                </SectionBox>

                <SectionBox title="PROJECT DETAILS">
                  <div className="space-y-1">
                    <p className="text-[12px]">
                      BDO /BDM: <span className="font-bold text-black">{orderData.bdm}</span>
                    </p>
                    <p className="text-[12px]">
                      Proposal #: <span className="font-mono font-bold text-black">{orderData.proposalNo}</span>
                    </p>
                    <p className="text-[12px]">
                      Proposal By: <span className="font-medium text-slate-700">{orderData.proposalBy}</span>
                    </p>
                  </div>
                </SectionBox>
              </div>

              <p className="mt-2 text-[10.5px] italic leading-tight text-slate-600 text-center">
                This Proposal form is issued in connection with the proposed project, and confirms our intent to proceed with the implementation as per the agreed terms and conditions.
              </p>

              {/* Middle Grid: Left (Order Summary + Financial Banner) & Right (Terms & Conditions) */}
              <div className="mt-2 grid grid-cols-12 gap-2 flex-1 min-h-[440px]">
                {/* Left Column (col-span-7): Order Summary + Financial Banner */}
                <div className="col-span-7 flex flex-col justify-between">
                  <SectionBox title="ORDER SUMMARY" className="flex-1">
                    <div
                      className="space-y-1.5 text-[13px] leading-relaxed text-black"
                      dangerouslySetInnerHTML={{ __html: orderData.orderSummaryHtml }}
                    />
                    <p className="mt-auto pt-2 text-center text-[10.5px] font-bold text-slate-500">
                      --- Continued ---
                    </p>
                  </SectionBox>

                  <FinancialBanner order={orderData} />
                </div>

                {/* Right Column (col-span-5): Terms & Conditions */}
                <div className="col-span-5 flex flex-col">
                  <SectionBox title="TERMS &amp; CONDITIONS" className="h-full">
                    <div
                      className="space-y-2 text-[12.5px] leading-relaxed text-black"
                      dangerouslySetInnerHTML={{ __html: orderData.termsSummaryHtml }}
                    />
                    <p className="mt-auto pt-2 text-center text-[10.5px] font-bold text-slate-500">
                      --- Detailed continued in Page 2 ---
                    </p>
                  </SectionBox>
                </div>
              </div>

              {/* Bottom 3-Box Row: Approved By | Accepted By | Bank Details */}
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                {/* Box 1: Approved By */}
                <div className="rounded-md border border-black bg-white p-2 text-black flex flex-col justify-between">
                  <div className="border-b border-black bg-black -mx-2 -mt-2 px-2 py-1 text-center text-[11.5px] font-bold uppercase text-white mb-1.5">
                    Approved By
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-700 flex items-center gap-1">
                      <span>Signature valid</span>
                      <span className="text-sm">✔</span>
                    </p>
                    <p className="text-[10.5px] text-slate-800">Digitally signed by <strong>Programers International</strong></p>
                    <p className="font-mono text-[9.5px] text-slate-500">Date: 2026.04.18 08:22:30 +00:00</p>
                    <p className="text-slate-500 text-[9.5px]">Location: Thrissur</p>
                  </div>
                </div>

                {/* Box 2: Accepted By */}
                <div className="rounded-md border border-black bg-white p-2 text-black flex flex-col justify-between">
                  <div className="border-b border-black bg-black -mx-2 -mt-2 px-2 py-1 text-center text-[11.5px] font-bold uppercase text-white mb-1.5">
                    Accepted By
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-700 flex items-center gap-1">
                      <span>Signature valid</span>
                      <span className="text-sm">✔</span>
                    </p>
                    <p className="text-[10.5px] text-slate-800">Digitally signed by <strong>{orderData.customerCompany}</strong></p>
                    <p className="font-mono text-[9.5px] text-slate-500">Date: 2026.04.18 08:22:30 +00:00</p>
                    <p className="text-slate-500 text-[9.5px]">Location: KOCHI</p>
                  </div>
                </div>

                {/* Box 3: Bank Details */}
                <div className="rounded-md border border-black bg-white p-2 text-black flex flex-col justify-between">
                  <div className="border-b border-black bg-black -mx-2 -mt-2 px-2 py-1 text-center text-[11.5px] font-bold uppercase text-white mb-1.5">
                    Bank Details
                  </div>
                  <div>
                    <p className="font-bold text-black text-[11.5px]">{orderData.bankName}</p>
                    <p className="text-[10px] text-slate-700 mt-0.5 leading-snug">{orderData.bankBranch}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2.5">
              <PageFooter />
            </div>
          </div>

          {/* =========================================================================
              PAGE 2: ANNEXURE - A (1/2) ORDER IN DETAILS
          ========================================================================= */}
          <div
            className="print-page mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm flex flex-col justify-between"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="flex flex-col flex-1 justify-between">
              <PageHeader order={orderData} annexLabel="ANNEXURE - A (1/2)" />

              <div className="mt-3 flex-1 flex flex-col">
                <SectionBox title="ORDER IN DETAILS" className="flex-1 flex flex-col justify-between min-h-[580px]">
                  <div
                    className="space-y-2 text-[13px] leading-relaxed text-black"
                    dangerouslySetInnerHTML={{ __html: orderData.orderInDetailsHtml }}
                  />
                  <p className="mt-3 text-right text-[11px] font-bold text-slate-400">--- End of page ---</p>
                </SectionBox>
              </div>
            </div>

            <div className="mt-3">
              <PageFooter />
            </div>
          </div>

          {/* =========================================================================
              PAGE 3: ANNEXURE - A (2/2) TERMS & CONDITIONS
          ========================================================================= */}
          <div
            className="print-page mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm flex flex-col justify-between"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="flex flex-col flex-1 justify-between">
              <PageHeader order={orderData} annexLabel="ANNEXURE - A (2/2)" />

              <div className="mt-3 flex-1 flex flex-col justify-between">
                <SectionBox title="TERMS &amp; CONDITIONS" className="flex-1">
                  <div
                    className="space-y-3 text-[12.5px] leading-relaxed text-black text-justify"
                    dangerouslySetInnerHTML={{ __html: orderData.legalTermsHtml }}
                  />
                </SectionBox>

                {/* Final Signatures & QR Block */}
                <div className="mt-2.5 grid grid-cols-12 gap-2">
                  <div className="col-span-5 rounded-md border border-black bg-white p-2">
                    <div className="border-b border-black bg-black -mx-2 -mt-2 px-2 py-1 text-center text-[11px] font-bold uppercase text-white mb-1">
                      Approved By
                    </div>
                    <div className="mt-1 text-[11px]">
                      <p className="font-bold text-emerald-700 flex items-center gap-1">
                        <span>Signature valid</span>
                        <span className="text-sm">✔</span>
                      </p>
                      <p className="text-slate-800 font-semibold mt-0.5">Programers International</p>
                      <p className="text-slate-500 text-[9.5px] font-mono mt-0.5">Date: 2026.04.18 08:22:30 +00:00</p>
                      <p className="text-slate-500 text-[9.5px]">Location: Thrissur</p>
                    </div>
                  </div>

                  <div className="col-span-5 rounded-md border border-black bg-white p-2">
                    <div className="border-b border-black bg-black -mx-2 -mt-2 px-2 py-1 text-center text-[11px] font-bold uppercase text-white mb-1">
                      Accepted By
                    </div>
                    <div className="mt-1 text-[11px]">
                      <p className="font-bold text-emerald-700 flex items-center gap-1">
                        <span>Signature valid</span>
                        <span className="text-sm">✔</span>
                      </p>
                      <p className="text-slate-800 font-semibold mt-0.5">{orderData.customerCompany}</p>
                      <p className="text-slate-500 text-[9.5px] font-mono mt-0.5">Date: 2026.04.18 08:22:30 +00:00</p>
                      <p className="text-slate-500 text-[9.5px]">Location: KOCHI</p>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-center rounded-md border border-black bg-white p-1">
                    <div className="h-[72px] w-[72px]">
                      <QRCodeVisual value={`https://leads.programersapps.com/orders/${orderData.id}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2.5">
              <PageFooter />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
