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
 */
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
}) {
  const contentRef = useRef(null)
  const footerRef = useRef(null)
  const paged = usePagedContent(contentRef, footerRef, [], reserve)

  return (
    <>
      <div className={pageClassName} style={{ boxSizing: 'border-box' }}>
        <div className="flex flex-1 flex-col">
          {pageHeader}
          <div className="mt-3 flex-1 flex flex-col">
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
                {continueNote && paged.part2Html ? (
                  <p className="mt-2 text-right text-[11px] font-bold text-slate-400">Continued…</p>
                ) : null}
                {!continueNote && (
                  <p className="mt-2 text-right text-[11px] font-bold text-slate-400">--- End of page ---</p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div ref={footerRef} className={pageFooterWrapClass}>
          {pageFooter}
        </div>
      </div>

      {paged.part2Html ? (
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
        />
      ) : null}
    </>
  )
}
