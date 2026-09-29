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
 * - `endBlockRef` (optional): a block that only belongs on the LAST page (e.g.
 *   a client acceptance / signature box). It is never reserved on pages that
 *   are still overflowing — those pages fill to the footer — so content no
 *   longer jumps to the next page while the current page still has blank
 *   space. Its height is measured while visible and stored so the decision
 *   never depends on its toggling display state (which would oscillate).
 *
 * Returns:
 *  - cap: max-height (px) to apply to the content element so it stays on-page
 *  - part2Html: HTML of the overflowing blocks to render on a continuation page
 *  - showEnd: whether the end block should be visible on this page
 *  - freePx: px of unused height between the last content line and the page
 *    boundary, measured only on the settled (final) page; 0 elsewhere
 */
export default function usePagedContent(contentRef, bottomRef, belowBlocks = [], reserve = 48, endBlockRef = null) {
  const [cap, setCap] = useState(undefined)
  const [part2Html, setPart2Html] = useState('')
  const [showEnd, setShowEnd] = useState(true)
  const [freePx, setFreePx] = useState(0)

  // Guard against re-render churn: only commit state when values actually change.
  const committed = useRef({ cap: undefined, part2Html: '', showEnd: true, freePx: 0 })

  // Measured height of the optional end block, captured while it is visible so
  // the page-fitting decision below doesn't depend on its live display state.
  const endCapHRef = useRef(0)

  // `belowBlocks` / `reserve` are read through refs so the `check` callback
  // (and therefore the measuring layout effect) keeps a stable identity even
  // when the caller passes a fresh array literal on every render.
  const belowRef = useRef(belowBlocks)
  const reserveRef = useRef(reserve)
  const endBlockRefRef = useRef(endBlockRef)

  // Once a page commits as the final page (no continuation), keep it final.
  // Incidental re-measures (font loads, async heights) must not re-spawn a
  // continuation page — that feedback made the content flicker and the page
  // height jump on every measurement tick.
  const finalLatchRef = useRef(false)

  useLayoutEffect(() => {
    belowRef.current = belowBlocks
    reserveRef.current = reserve
    endBlockRefRef.current = endBlockRef
  })

  const check = useCallback(() => {
    const bottomEl = bottomRef && bottomRef.current
    const contentEl = contentRef && contentRef.current
    if (!bottomEl || !contentEl || contentEl.children.length === 0) return

    // A once-final page is frozen: stop measuring it. Mounting the end block
    // (or incidental font/resize noise) must never push it back into a
    // continuation and start the flicker again. The latch is cleared only when
    // the content's children materially change (see MutationObserver below).
    if (finalLatchRef.current) {
      // One exception: real fonts may load after the first measure and grow the
      // text taller than the frozen cap. A frozen cap that now clips content is
      // stale, so lift the latch and re-measure — otherwise the bottom lines are
      // silently hidden by `overflow: hidden` with no continuation page.
      const capNow = committed.current.cap
      if (typeof capNow === 'number' && contentEl.scrollHeight > capNow + 1) {
        finalLatchRef.current = false
      } else {
        return
      }
    }

    const contentTop = contentEl.getBoundingClientRect().top
    // The footer element normally marks the lower boundary, but overflowing
    // flex content can push it down and balloon the cap (making pagination
    // think everything fits). Anchor the boundary to the fixed `.print-page`
    // edge instead — the footer's pinned position — so measurements are stable
    // regardless of what is mounted beneath the content.
    let bottom = bottomEl.getBoundingClientRect().top
    try {
      const pageEl = bottomEl && bottomEl.closest ? bottomEl.closest('.print-page') : null
      if (pageEl) {
        const pr = pageEl.getBoundingClientRect()
        const pinned = pr.bottom - 38 - (bottomEl.offsetHeight || 0)
        if (pinned < bottom) bottom = pinned
      }
    } catch {
      // measurement is best-effort; fall back to the raw footer position
    }
    const below = (belowRef.current || []).reduce((sum, r) => {
      const el = r && r.current
      return sum + (el && el.offsetHeight ? el.offsetHeight : 0)
    }, 0)
    const gaps = (belowRef.current?.length || 0) * 14
    const reserve = typeof reserveRef.current === 'number' ? reserveRef.current : 48
    const c = Math.max(48, bottom - 16 - contentTop - below - gaps - reserve)

    // Measure the end block's real height while it is visible (it mounts
    // visible on every page, so the first pass always captures it). Stored so
    // later passes keep the same math even once the block is display:none.
    const endEl = endBlockRefRef.current && endBlockRefRef.current.current
    if (endEl && endEl.offsetHeight > 0) endCapHRef.current = endEl.offsetHeight

    const base = contentEl.getBoundingClientRect().top
    // `limit` is the max distance from the content top a block may reach.
    const splitAt = (limit) => {
      let last = 0
      const over = []
      for (const child of contentEl.children) {
        const rect = child.getBoundingClientRect()
        const cb = rect.top + rect.height - base
        if (cb > limit) over.push({ html: child.outerHTML, height: rect.height })
        else last = cb
      }
      return { last, over }
    }

    let nextCap = c
    let nextPart2 = ''
    let nextShowEnd = true
    let nextFreePx = 0

    if (endEl && endCapHRef.current > 0) {
      // Phase 1 — available height with the end block excluded. Pages that
      // still overflow are plain fill pages: full height, no end block.
      const full = splitAt(c)
      if (full.over.length) {
        const unsplit = full.over.length === 1 && full.over[0].height > c
        if (!unsplit) {
          nextCap = Math.max(48, full.last)
          nextPart2 = full.over.map((o) => o.html).join('')
          nextShowEnd = false
        } else {
          // Single block taller than the whole page can never be split; never
          // let the end block overlap it on top of the unavoidable clipping.
          nextShowEnd = false
        }
      } else {
        // Phase 2 — content fits free space; can the end block fit too?
        const cEnd = Math.max(48, c - endCapHRef.current - 8)
        const withEnd = splitAt(cEnd)
        if (withEnd.over.length) {
          // Content + end block don't fit together: keep the end block for the
          // last page and push the overflow lines onto a continuation page.
          const unsplit = withEnd.over.length === 1 && withEnd.over[0].height > cEnd
          if (!unsplit) {
            nextCap = Math.max(48, withEnd.last)
            nextPart2 = withEnd.over.map((o) => o.html).join('')
            nextShowEnd = false
          } else {
            nextShowEnd = false
          }
        } else {
          nextShowEnd = true
        }
      }
    } else {
      // No end block: plain overflow split (existing behaviour).
      const { last, over } = splitAt(c)
      if (over.length) {
        const unsplit = over.length === 1 && over[0].height > c
        if (!unsplit) {
          nextCap = Math.max(48, last)
          nextPart2 = over.map((o) => o.html).join('')
        }
      } else {
        // Settled final page — expose how many px are left over after the last
        // line, so callers can (for example) place an inset section inline.
        nextFreePx = Math.max(0, c - last)
      }
    }

    // A once-final page stays final.
    const prev = committed.current
    if (
      prev.cap !== nextCap ||
      prev.part2Html !== nextPart2 ||
      prev.showEnd !== nextShowEnd ||
      prev.freePx !== nextFreePx
    ) {
      committed.current = { cap: nextCap, part2Html: nextPart2, showEnd: nextShowEnd, freePx: nextFreePx }
      if (nextPart2 === '') finalLatchRef.current = true
      setCap(nextCap)
      setPart2Html(nextPart2)
      setShowEnd(nextShowEnd)
      setFreePx(nextFreePx)
    }
  }, [contentRef, bottomRef])

  useLayoutEffect(() => {
    const contentEl = contentRef && contentRef.current

    check()

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
    // Watch the end block too: toggling its visibility must re-run the check
    // (the decision is deterministic, so this never oscillates) and feeding
    // fresh fonts/async heights keeps its stored height current.
    let endObserver
    const endEl = endBlockRefRef.current && endBlockRefRef.current.current
    if (endEl && typeof MutationObserver !== 'undefined') {
      endObserver = new MutationObserver(() => {
        finalLatchRef.current = false
        check()
      })
      endObserver.observe(endEl, { attributes: true, childList: true, subtree: true, characterData: true })
    }

    return () => {
      window.removeEventListener('resize', check)
      if (observer) observer.disconnect()
      if (endObserver) endObserver.disconnect()
    }
  }, [check, contentRef])

  return { cap, part2Html, showEnd, freePx }
}
