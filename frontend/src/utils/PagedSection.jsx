import { useRef } from 'react'
import usePagedContent from './usePagedContent'

/**
 * Renders one A4 continuation page holding overflowing section HTML and, if
 * that content still overflows its own page, recursively renders further
 * continuation pages. This guarantees long sections are never clipped.
 *
 * - `html`: overflowing HTML to place on this page (the previous page's part2)
 * - `pageHeader` / `pageFooter`: React nodes placed at the top/bottom of the page
 * - `contentRef` is created internally and capped against the page footer so
 *   the recursion terminates once the tail fits on a single page.
 * - `insetSection` (optional): a full-width box that follows the main content.
 *   On the settled final page of the main content it is rendered inline if at
 *   least `minFraction` (default 0.5) of the page is still empty; otherwise it
 *   starts on a fresh page. Its own overflow (and optional `endBlock`) flows
 *   onto continuation pages below.
 * - `insetSection.insetSection` (optional): a second box that follows the first
 *   inset by the same rule — inline when the first inset is inline on this page
 *   and leaves at least `minFraction` of its usable height free, else on a fresh
 *   page. This supports a chain such as Summary → Details → Terms.
 *
 * Recursion is hard-capped at `MAX_CONTINUATION_PAGES` as a safety net — the
 * pagination in `usePagedContent` already stops splitting content that can
 * never fit a page, so the cap should never be reached with normal data.
 */
const MAX_CONTINUATION_PAGES = 12

export default function PagedSection({
  html,
  reserve = 48,
  contentClass = '',
  sectionTitle = '',
  boxClass = 'rounded-md border border-black bg-white',
  titleClass = 'text-center border-b border-black',
  paddingClass = 'p-3.5',
  pageHeader,
  pageFooter,
  pageFooterWrapClass = 'mt-2.5',
  pageClassName = 'print-page mx-auto w-full max-w-[210mm] h-[297mm] overflow-hidden bg-white p-[10mm] shadow-2xl border border-slate-300 rounded-sm flex flex-col justify-between',
  continueNote = true,
  endBlock = null,
  endBlockClass = '',
  pageIndex = 0,
  insetSection = null,
}) {
  const contentRef = useRef(null)
  const footerRef = useRef(null)
  const endBlockRef = useRef(null)
  const paged = usePagedContent(contentRef, footerRef, [], reserve, endBlock ? endBlockRef : null)
  const showEnd = endBlock && paged.showEnd
  const atLimit = pageIndex >= MAX_CONTINUATION_PAGES
  const showContinue = continueNote && paged.part2Html && !atLimit

  const isFinalMain = paged.part2Html === ''
  const usablePx = paged.cap || 0
  const freePx = isFinalMain ? paged.freePx || 0 : 0
  const mainEndOverflow = Boolean(endBlock) && paged.endOverflow
  const showInsetInline =
    Boolean(insetSection) &&
    isFinalMain &&
    usablePx > 0 &&
    freePx >= usablePx * (insetSection.minFraction ?? 0.5)

  // Inline inset is measured against this page's own footer so its cap is
  // exactly the free space left by the main content. Its overflow renders on
  // fresh pages (see below) carrying the same end block (e.g. a signature).
  const insetContentRef = useRef(null)
  const insetAcceptRef = useRef(null)
  const insetPaged = usePagedContent(
    insetContentRef,
    footerRef,
    [],
    insetSection?.reserve ?? reserve,
    insetSection?.endBlock ? insetAcceptRef : null
  )

  // Optional second inset (e.g. Terms after Details after Summary). It follows
  // the outer inset inline when the outer inset leaves at least its
  // `minFraction` of usable height free; otherwise it starts on a fresh page.
  // Its overflow and end block obey the exact same rules as the outer one.
  const nested2 = insetSection?.insetSection || null
  const inset2ContentRef = useRef(null)
  const inset2AcceptRef = useRef(null)
  const inset2Paged = usePagedContent(
    inset2ContentRef,
    footerRef,
    [],
    nested2?.reserve ?? reserve,
    nested2?.endBlock ? inset2AcceptRef : null
  )
  const showNestedInline =
    Boolean(nested2) &&
    showInsetInline &&
    insetPaged.part2Html === '' &&
    (insetPaged.cap || 0) > 0 &&
    (insetPaged.freePx || 0) >= (insetPaged.cap || 0) * (nested2.minFraction ?? 0.5)

  const insetEndOverflow = Boolean(insetSection?.endBlock) && showInsetInline && insetPaged.endOverflow
  const inset2EndOverflow = Boolean(nested2?.endBlock) && showNestedInline && inset2Paged.endOverflow
  const endOverflowPage =
    (mainEndOverflow || insetEndOverflow || inset2EndOverflow) && !atLimit

  const insetBox = insetSection ? (
    <div className={`overflow-hidden ${insetSection.boxClass || boxClass} flex flex-col`}>
      <div
        className={`shrink-0 bg-black px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider text-white ${
          insetSection.titleClass || titleClass
        }`}
      >
        {insetSection.title}
      </div>
      <div className={`flex-1 flex flex-col justify-start ${insetSection.paddingClass || paddingClass}`}>
        <div
          ref={insetContentRef}
          className={insetSection.contentClass || contentClass}
          style={insetPaged.cap ? { maxHeight: insetPaged.cap, overflow: 'hidden' } : undefined}
          dangerouslySetInnerHTML={{ __html: insetSection.html }}
        />
        {insetPaged.part2Html ? (
          <p className="mt-2 text-right text-[11px] font-bold text-slate-400">Continued…</p>
        ) : null}
      </div>
    </div>
  ) : null

  const inset2Box = nested2 ? (
    <div className={`overflow-hidden ${nested2.boxClass || boxClass} flex flex-col`}>
      <div
        className={`shrink-0 bg-black px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider text-white ${
          nested2.titleClass || titleClass
        }`}
      >
        {nested2.title}
      </div>
      <div className={`flex-1 flex flex-col justify-start ${nested2.paddingClass || paddingClass}`}>
        <div
          ref={inset2ContentRef}
          className={nested2.contentClass || contentClass}
          style={inset2Paged.cap ? { maxHeight: inset2Paged.cap, overflow: 'hidden' } : undefined}
          dangerouslySetInnerHTML={{ __html: nested2.html }}
        />
        {inset2Paged.part2Html ? (
          <p className="mt-2 text-right text-[11px] font-bold text-slate-400">Continued…</p>
        ) : null}
      </div>
    </div>
  ) : null

  const insetChunk = insetSection ? (
    <div className="mt-3 flex flex-1 flex-col">
      {insetBox}
      {insetSection.endBlock ? (
        <div ref={insetAcceptRef} className={`pt-4 ${insetPaged.showEnd ? '' : 'hidden'}`}>
          {insetSection.endBlock}
        </div>
      ) : null}
      {showNestedInline ? (
        <div className="mt-3 flex flex-col">
          {inset2Box}
          {nested2.endBlock ? (
            <div ref={inset2AcceptRef} className={`pt-4 ${inset2Paged.showEnd ? '' : 'hidden'}`}>
              {nested2.endBlock}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <>
      <div className={pageClassName} style={{ boxSizing: 'border-box' }}>
        <div className="flex flex-1 flex-col">
          {pageHeader}
          <div className={`mt-3 flex flex-col ${endBlock ? '' : 'flex-1'}`}>
            <div className={`overflow-hidden ${boxClass} flex flex-col`}>
              <div
                className={`shrink-0 bg-black px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider text-white ${titleClass}`}
              >
                {sectionTitle}
              </div>
              <div className={`flex-1 flex flex-col justify-start ${paddingClass}`}>
                <div
                  ref={contentRef}
                  className={contentClass}
                  style={paged.cap ? { maxHeight: paged.cap, overflow: 'hidden' } : undefined}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
                {showContinue ? (
                  <p className="mt-2 text-right text-[11px] font-bold text-slate-400">Continued…</p>
                ) : null}
              </div>
            </div>
            {showInsetInline ? insetChunk : null}
          </div>
          {endBlock ? (
            <div
              ref={endBlockRef}
              className={`pt-4 ${endBlockClass} ${showEnd ? '' : 'hidden'}`}
            >
              {endBlock}
            </div>
          ) : null}
        </div>
        <div ref={footerRef} className={pageFooterWrapClass}>
          {pageFooter}
        </div>
      </div>

      {paged.part2Html && !atLimit ? (
        <PagedSection
          html={paged.part2Html}
          reserve={reserve}
          contentClass={contentClass}
          sectionTitle={sectionTitle}
          boxClass={boxClass}
          titleClass={titleClass}
          paddingClass={paddingClass}
          pageHeader={pageHeader}
          pageFooter={pageFooter}
          pageFooterWrapClass={pageFooterWrapClass}
          pageClassName={pageClassName}
          continueNote={continueNote}
          endBlock={endBlock}
          endBlockClass={endBlockClass}
          pageIndex={pageIndex + 1}
          insetSection={insetSection}
        />
      ) : null}

      {endOverflowPage ? (
        <div className={pageClassName} style={{ boxSizing: 'border-box' }}>
          <div className="flex flex-1 flex-col">
            {inset2EndOverflow
              ? nested2.pageHeader
              : insetEndOverflow
              ? insetSection.pageHeader
              : pageHeader}
            <div className="flex flex-1 flex-col justify-end">
              <div className={`pt-4 ${endBlockClass}`}>
                {inset2EndOverflow
                  ? nested2.endBlock
                  : insetEndOverflow
                  ? insetSection.endBlock
                  : endBlock}
              </div>
            </div>
          </div>
          <div className={pageFooterWrapClass}>
            {inset2EndOverflow
              ? nested2.pageFooter
              : insetEndOverflow
              ? insetSection.pageFooter
              : pageFooter}
          </div>
        </div>
      ) : null}

      {showInsetInline && insetPaged.part2Html && !atLimit ? (
        <PagedSection
          html={insetPaged.part2Html}
          reserve={insetSection?.reserve ?? reserve}
          contentClass={insetSection?.contentClass || contentClass}
          sectionTitle={insetSection?.continueTitle || `${insetSection?.title} (CONTINUED)`}
          boxClass={insetSection?.boxClass || boxClass}
          titleClass={insetSection?.titleClass || titleClass}
          paddingClass={insetSection?.paddingClass || paddingClass}
          pageHeader={insetSection?.pageHeader}
          pageFooter={insetSection?.pageFooter}
          pageFooterWrapClass={pageFooterWrapClass}
          pageClassName={pageClassName}
          endBlock={insetSection?.endBlock || null}
          endBlockClass={endBlockClass}
          pageIndex={0}
          insetSection={insetSection?.insetSection || null}
        />
      ) : null}

      {showNestedInline && inset2Paged.part2Html && !atLimit ? (
        <PagedSection
          html={inset2Paged.part2Html}
          reserve={nested2?.reserve ?? reserve}
          contentClass={nested2?.contentClass || contentClass}
          sectionTitle={nested2?.continueTitle || `${nested2?.title} (CONTINUED)`}
          boxClass={nested2?.boxClass || boxClass}
          titleClass={nested2?.titleClass || titleClass}
          paddingClass={nested2?.paddingClass || paddingClass}
          pageHeader={nested2?.pageHeader}
          pageFooter={nested2?.pageFooter}
          pageFooterWrapClass={pageFooterWrapClass}
          pageClassName={pageClassName}
          endBlock={nested2?.endBlock || null}
          endBlockClass={endBlockClass}
          pageIndex={0}
          insetSection={nested2?.insetSection || null}
        />
      ) : null}

      {insetSection && isFinalMain && !showInsetInline ? (
        <PagedSection
          html={insetSection.html}
          reserve={insetSection.reserve ?? reserve}
          contentClass={insetSection.contentClass || contentClass}
          sectionTitle={insetSection.title}
          boxClass={insetSection.boxClass || boxClass}
          titleClass={insetSection.titleClass || titleClass}
          paddingClass={insetSection.paddingClass || paddingClass}
          pageHeader={insetSection.pageHeader}
          pageFooter={insetSection.pageFooter}
          pageFooterWrapClass={pageFooterWrapClass}
          pageClassName={pageClassName}
          endBlock={insetSection.endBlock || null}
          endBlockClass={endBlockClass}
          pageIndex={0}
          insetSection={insetSection?.insetSection || null}
        />
      ) : null}

      {nested2 &&
      showInsetInline &&
      insetPaged.part2Html === '' &&
      (insetPaged.cap || 0) > 0 &&
      !showNestedInline &&
      !atLimit ? (
        <PagedSection
          html={nested2.html}
          reserve={nested2?.reserve ?? reserve}
          contentClass={nested2?.contentClass || contentClass}
          sectionTitle={nested2?.title}
          boxClass={nested2?.boxClass || boxClass}
          titleClass={nested2?.titleClass || titleClass}
          paddingClass={nested2?.paddingClass || paddingClass}
          pageHeader={nested2?.pageHeader}
          pageFooter={nested2?.pageFooter}
          pageFooterWrapClass={pageFooterWrapClass}
          pageClassName={pageClassName}
          endBlock={nested2?.endBlock || null}
          endBlockClass={endBlockClass}
          pageIndex={0}
          insetSection={nested2?.insetSection || null}
        />
      ) : null}
    </>
  )
}