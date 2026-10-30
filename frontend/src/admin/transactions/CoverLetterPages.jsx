import { useRef } from 'react'
import usePagedContent from '../../utils/usePagedContent'

/**
 * Renders a cover letter as A4 pages.
 *
 * The letter is a single rich-text flow; it is split onto continuation pages
 * with the same paginator the proposal form uses, so a long letter is never
 * clipped. Every page is a `.print-page` element, which means the proposal
 * preview's "Save as PDF" export and its "Page N of M" footer stamping pick
 * the cover letter up automatically.
 */

const PAGE_CLASS =
  'print-page mx-auto flex w-full max-w-[210mm] flex-col h-[297mm] overflow-hidden bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm'

// Hard cap on the continuation pages of one letter (safety net only).
const MAX_CONTINUATION_PAGES = 12

// True when the letter has anything worth printing (text or an image).
export function coverLetterHasContent(html) {
  const raw = String(html || '')
  if (/<img\b/i.test(raw)) return true
  return raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim().length > 0
}

function LetterHeader({ company }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
      <div className="min-w-0">
        <p className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-900">
          Cover Letter
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {company?.name || ''}
        </p>
      </div>
      {company?.logo ? (
        <img
          src={company.logo}
          alt={company?.name || 'Company logo'}
          crossOrigin="anonymous"
          className="h-12 w-auto max-w-[200px] object-contain"
        />
      ) : null}
    </div>
  )
}

function LetterFooter({ company }) {
  const parts = []
  if (company?.address) parts.push(company.address)
  if (company?.email) parts.push(company.email)
  if (company?.website) parts.push(company.website)
  if (company?.phone) parts.push(`Ph: ${company.phone}`)
  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center text-[10.5px] leading-relaxed text-slate-600">
        {parts.join(' | ') || company?.name || ''}
      </div>
      <p
        data-page-number
        className="mt-1.5 text-center text-[10px] font-bold tracking-wide text-slate-500"
      />
    </>
  )
}

function LetterPage({ html, company, pageIndex = 0 }) {
  const contentRef = useRef(null)
  const footerRef = useRef(null)
  const paged = usePagedContent(contentRef, footerRef, [], 32)
  // Safety net: a letter is never this long, but the recursion must stop.
  const atLimit = pageIndex >= MAX_CONTINUATION_PAGES

  return (
    <>
      <div className={PAGE_CLASS} style={{ boxSizing: 'border-box' }}>
        <div className="flex flex-1 flex-col">
          <LetterHeader company={company} />
          <div
            ref={contentRef}
            className="cover-letter-body mt-5 shrink-0 text-[12.5px] leading-[1.75] text-slate-800"
            style={
              typeof paged.cap === 'number'
                ? { maxHeight: paged.cap, overflow: 'hidden' }
                : undefined
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {paged.part2Html ? (
            <p className="mt-2 shrink-0 text-right text-[11px] font-bold text-slate-400">
              Continued…
            </p>
          ) : null}
        </div>
        <div ref={footerRef} className="mt-4">
          <LetterFooter company={company} />
        </div>
      </div>

      {paged.part2Html && !atLimit ? (
        <LetterPage
          html={paged.part2Html}
          company={company}
          pageIndex={pageIndex + 1}
        />
      ) : null}
    </>
  )
}

export default function CoverLetterPages({ html, company = {}, className = '' }) {
  if (!coverLetterHasContent(html)) return null
  return (
    <div className={`space-y-8 print:space-y-0 ${className}`}>
      <LetterPage html={html} company={company} />
    </div>
  )
}
