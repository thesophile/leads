import { useCallback, useLayoutEffect, useState, useRef } from 'react'

/**
 * Paginates a box of HTML content inside a fixed-height A4 page.
 *
 * - `contentRef`: attach to the rendered content element (renders the FULL html)
 * - `bottomRef`: element whose top marks the STABLE lower boundary the content
 *   must never cross (e.g. the page footer top, which is pinned to the page and
 *   does NOT move with the content). Must NOT be pushed down/up by the content
 *   itself, otherwise a feedback loop shrinks the cap.
 * - `belowBlocks`: refs of fixed blocks that sit between the content and the
 *   bottom boundary (e.g. an Approved By box / financial banner). Their
 *   intrinsic heights are reserved above the boundary.
 * - `reserve`: extra px of breathing room.
 *
 * Returns:
 *  - cap: max-height (px) to apply to the content element so it stays on-page
 *  - part2Html: HTML of the overflowing blocks to render on a continuation page
 */
export default function usePagedContent(contentRef, bottomRef, belowBlocks = [], reserve = 48) {
  const [cap, setCap] = useState(undefined)
  const [part2Html, setPart2Html] = useState('')

  // Guard against re-render churn: only commit state when values actually change.
  const committed = useRef({ cap: undefined, part2Html: '' })

  // `belowBlocks` / `reserve` are read through refs so the `check` callback
  // (and therefore the measuring layout effect) keeps a stable identity even
  // when the caller passes a fresh array literal on every render.
  const belowRef = useRef(belowBlocks)
  const reserveRef = useRef(reserve)

  // Once a page commits as the final page (no continuation), keep it final.
  // Incidental re-measures (font loads, async heights) must not re-spawn a
  // continuation page — that feedback made the content flicker and the page
  // height jump on every measurement tick.
  const finalLatchRef = useRef(false)

  useLayoutEffect(() => {
    belowRef.current = belowBlocks
    reserveRef.current = reserve
  })

  const check = useCallback(() => {
    const bottomEl = bottomRef && bottomRef.current
    const contentEl = contentRef && contentRef.current
    if (!bottomEl || !contentEl || contentEl.children.length === 0) return

    // A once-final page is frozen: stop measuring it. Mounting the end block
    // (or incidental font/resize noise) must never push it back into a
    // continuation and start the flicker again. The latch is cleared only when
    // the content's children materially change (see MutationObserver below).
    if (finalLatchRef.current) return

    const contentTop = contentEl.getBoundingClientRect().top
    const bottom = bottomEl.getBoundingClientRect().top
    const below = (belowRef.current || []).reduce((sum, r) => {
      const el = r && r.current
      return sum + (el && el.offsetHeight ? el.offsetHeight : 0)
    }, 0)
    const gaps = (belowRef.current?.length || 0) * 14
    const reserve = typeof reserveRef.current === 'number' ? reserveRef.current : 48
    const c = Math.max(48, bottom - 16 - contentTop - below - gaps - reserve)

    const base = contentEl.getBoundingClientRect().top
    let lastFit = 0
    const overflowing = []
    for (const child of contentEl.children) {
      const rect = child.getBoundingClientRect()
      const childBottom = rect.top + rect.height - base
      if (childBottom > c) {
        overflowing.push({ html: child.outerHTML, height: rect.height })
      } else {
        lastFit = childBottom
      }
    }

    // A continuation page only helps when the overflow can be split into blocks
    // smaller than the available area. A single block taller than the whole
    // page can never fit any continuation page, so stop paginating here — this
    // is what keeps recursive continuation pages from looping forever and
    // throwing React's "Maximum update depth exceeded".
    let nextCap = c
    let nextPart2 = ''
    if (overflowing.length) {
      const singleUnsplitBlock = overflowing.length === 1 && overflowing[0].height > c
      if (!singleUnsplitBlock) {
        // Snap the cap to the bottom of the last fully-fitted block so no block
        // is partially clipped on this page.
        nextCap = Math.max(48, lastFit)
        nextPart2 = overflowing.map((o) => o.html).join('')
      }
    }

    // A once-final page stays final.
    const prev = committed.current
    if (prev.cap !== nextCap || prev.part2Html !== nextPart2) {
      committed.current = { cap: nextCap, part2Html: nextPart2 }
      if (nextPart2 === '') finalLatchRef.current = true
      setCap(nextCap)
      setPart2Html(nextPart2)
    }
  }, [contentRef, bottomRef])

  useLayoutEffect(() => {
    const contentEl = contentRef && contentRef.current

    check()

    // Re-measure on a short polling loop so content that loads asynchronously
    // (network fetch, navigation state) is captured as soon as it renders.
    const interval = setInterval(check, 250)

    window.addEventListener('resize', check)
    const onFonts = () => check()
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(onFonts)
    }

    // Re-measure immediately when innerHTML/children change (e.g. data arrives).
    // A real content change also clears the final-page latch so genuinely new
    // content is allowed to re-paginate.
    let observer
    if (contentEl && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        finalLatchRef.current = false
        check()
      })
      observer.observe(contentEl, { childList: true, subtree: true, characterData: true })
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', check)
      if (observer) observer.disconnect()
    }
  }, [check, contentRef])

  return { cap, part2Html }
}
