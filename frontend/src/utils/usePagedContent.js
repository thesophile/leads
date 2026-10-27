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
 *   a client acceptance / signature box). It flows right after the final
 *   content line on the page where the content ends — it is never bottom-pinned
 *   and never reserved on pages where it isn't shown. If the content alone fits
 *   the page but the end block cannot follow it, the content stays put (no dead
 *   blank slot) and `endOverflow` tells the caller to place the end block on
 *   its own continuation page. Its height is measured while visible and stored
 *   so the decision never depends on its toggling display state (which would
 *   oscillate).
 * - `fullCap` (optional): the content height available on a full page (i.e. the
 *   cap of a box that starts at the top of the page). Used only for the
 *   unsplittable-block guard: an inset can have a much smaller cap than a full
 *   page, and a block that merely exceeded that small remainder must still be
 *   allowed to continue on its own page instead of being clipped. Pass 0 (the
 *   default) when the measured cap already is a full-page cap.
 *
 * Returns:
 *  - cap: max-height (px) to apply to the content element so it stays on-page
 *  - part2Html: HTML of the overflowing blocks to render on a continuation page
 *  - showEnd: whether the end block should be visible on this page
 *  - freePx: px of unused height between the last content line and the page
 *    boundary, measured only on the settled (final) page; 0 elsewhere
 *  - endOverflow: true when the end block could not fit after the content and
 *    needs to render on its own continuation page
 */
export default function usePagedContent(contentRef, bottomRef, belowBlocks = [], reserve = 48, endBlockRef = null, fullCap = 0) {
  const [cap, setCap] = useState(undefined)
  const [part2Html, setPart2Html] = useState('')
  const [showEnd, setShowEnd] = useState(true)
  const [freePx, setFreePx] = useState(0)
  const [endOverflow, setEndOverflow] = useState(false)

  // Guard against re-render churn: only commit state when values actually change.
  const committed = useRef({ cap: undefined, part2Html: '', showEnd: true, freePx: 0, endOverflow: false })

  // Measured height of the optional end block, captured while it is visible so
  // the page-fitting decision below doesn't depend on its live display state.
  const endCapHRef = useRef(0)

  // `belowBlocks` / `reserve` are read through refs so the `check` callback
  // (and therefore the measuring layout effect) keeps a stable identity even
  // when the caller passes a fresh array literal on every render.
  const belowRef = useRef(belowBlocks)
  const reserveRef = useRef(reserve)
  const endBlockRefRef = useRef(endBlockRef)
  const fullCapRef = useRef(fullCap)

  // Once a page commits as the final page (no continuation), keep it final.
  // Incidental re-measures (font loads, async heights) must not re-spawn a
  // continuation page — that feedback made the content flicker and the page
  // height jump on every measurement tick.
  const finalLatchRef = useRef(false)

  useLayoutEffect(() => {
    belowRef.current = belowBlocks
    reserveRef.current = reserve
    endBlockRefRef.current = endBlockRef
    fullCapRef.current = fullCap
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
    const reserve = typeof reserveRef.current === 'number' ? reserveRef.current : 16
    const c = Math.max(0, bottom - 16 - contentTop - below - gaps - reserve)

    // Measure the end block's real height while it is visible (it mounts
    // visible on every page, so the first pass always captures it). Stored so
    // later passes keep the same math even once the block is display:none.
    const endEl = endBlockRefRef.current && endBlockRefRef.current.current
    if (endEl && endEl.offsetHeight > 0) endCapHRef.current = endEl.offsetHeight

    // Temporarily unconstrain contentEl so child bounding rects reflect their
    // full, unclipped layout height rather than an already-applied maxHeight.
    const prevMaxH = contentEl.style.maxHeight
    const prevOverflow = contentEl.style.overflow
    contentEl.style.maxHeight = 'none'
    contentEl.style.overflow = 'visible'

    const isHeadingChild = (el) => {
      if (!el) return false
      const text = (el.innerText || el.textContent || '').trim()
      if (!text || text.length > 70) return false
      if (/^(\d+[\.\)]|\([0-9]+\))\s+[A-Za-z]/.test(text)) return true
      if (el.querySelector && el.querySelector('strong, b, h1, h2, h3, h4, h5, h6') && text.length < 50) return true
      return false
    }

    const base = contentEl.getBoundingClientRect().top
    // `limit` is the max distance from the content top a block may reach.
    const splitAt = (limit) => {
      let last = 0
      const fits = []
      const over = []
      for (const child of contentEl.children) {
        const rect = child.getBoundingClientRect()
        const childH = Math.max(rect.height, child.offsetHeight || 0, child.scrollHeight || 0)
        const cb = rect.top + childH - base
        if (cb > limit) {
          over.push({ html: child.outerHTML, height: childH })
        } else {
          fits.push({ child, cb, height: childH })
          last = cb
        }
      }

      // If the last item that fit is a section heading and content follows in `over`,
      // push the heading to `over` so it is not orphaned alone at the bottom of the page.
      if (fits.length > 0 && over.length > 0) {
        const lastFit = fits[fits.length - 1]
        if (isHeadingChild(lastFit.child)) {
          fits.pop()
          over.unshift({ html: lastFit.child.outerHTML, height: lastFit.height })
          last = fits.length > 0 ? fits[fits.length - 1].cb : 0
        }
      }

      return { last, over }
    }

    let nextCap = undefined
    let nextPart2 = ''
    let nextShowEnd = true
    let nextFreePx = 0
    let nextEndOverflow = false

    // A block is only truly unsplittable when it cannot fit a FULL page. An
    // inline inset may have a much smaller cap than that, so compare against
    // the supplied full-page cap (falling back to this page's own cap).
    const splitLimit = fullCapRef.current > 0 ? fullCapRef.current : c

    if (endEl && endCapHRef.current > 0) {
      // Phase 1 — available height with the end block excluded. Pages that
      // still overflow are plain fill pages: full height, no end block.
      const full = splitAt(c)
      if (full.over.length) {
        const unsplit = full.last === 0 && full.over.length === 1 && full.over[0].height > splitLimit
        if (!unsplit) {
          nextCap = full.last > 0 ? Math.ceil(full.last) : 0
          nextPart2 = full.over.map((o) => o.html).join('')
          nextShowEnd = false
        } else {
          // Single block taller than the whole page can never be split; never
          // let the end block overlap it on top of the unavoidable clipping.
          nextShowEnd = false
        }
      } else {
        // Phase 2 — the content fits this page, so the end block follows it
        // naturally. Content fits completely, so do NOT cap maxHeight.
        nextCap = undefined
        const contentEnd = full.last
        const needsEndPage =
          contentEnd > 0 &&
          endCapHRef.current > 70 &&
          contentEnd + endCapHRef.current + 8 > c + reserve
        if (needsEndPage) {
          nextShowEnd = false
          nextEndOverflow = true
        } else {
          nextShowEnd = true
          nextFreePx = Math.max(0, c - contentEnd)
        }
      }
    } else {
      // No end block: plain overflow split (existing behaviour).
      const { last, over } = splitAt(c)
      if (over.length) {
        const unsplit = last === 0 && over.length === 1 && over[0].height > splitLimit
        if (!unsplit) {
          nextCap = last > 0 ? Math.ceil(last) : 0
          nextPart2 = over.map((o) => o.html).join('')
        }
      } else {
        // Settled final page — content fits completely, do NOT cap maxHeight.
        nextCap = undefined
        nextFreePx = Math.max(0, c - last)
      }
    }

    // Restore prior styles while React state update is pending
    contentEl.style.maxHeight = prevMaxH
    contentEl.style.overflow = prevOverflow

    // A once-final page stays final.
    const prev = committed.current
    if (
      prev.cap !== nextCap ||
      prev.part2Html !== nextPart2 ||
      prev.showEnd !== nextShowEnd ||
      prev.freePx !== nextFreePx ||
      prev.endOverflow !== nextEndOverflow
    ) {
      committed.current = { cap: nextCap, part2Html: nextPart2, showEnd: nextShowEnd, freePx: nextFreePx, endOverflow: nextEndOverflow }
      if (nextPart2 === '') finalLatchRef.current = true
      setCap(nextCap)
      setPart2Html(nextPart2)
      setShowEnd(nextShowEnd)
      setFreePx(nextFreePx)
      setEndOverflow(nextEndOverflow)
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

  // A content element can mount on a later commit than the hook itself — e.g. an
  // inset that only renders once the page has room, or a chained inset waiting
  // on its parent. The setup effect above runs only once, so its observer is
  // attached against a null element and never fires; without this, such an
  // element is never measured, its `cap` stays unset and the fixed-height page
  // clips its content with no continuation page. Re-check every commit so a
  // freshly-mounted element is measured immediately. `check` only commits state
  // when values actually change and settled pages latch, so this converges.
  useLayoutEffect(() => {
    check()
  })

  return { cap, part2Html, showEnd, freePx, endOverflow }
}
