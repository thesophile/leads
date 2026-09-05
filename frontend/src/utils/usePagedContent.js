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

  const check = useCallback(() => {
    const bottomEl = bottomRef && bottomRef.current
    const contentEl = contentRef && contentRef.current
    if (!bottomEl || !contentEl || contentEl.children.length === 0) return

    const contentTop = contentEl.getBoundingClientRect().top
    const bottom = bottomEl.getBoundingClientRect().top
    const below = (belowBlocks || []).reduce((sum, r) => {
      const el = r && r.current
      return sum + (el && el.offsetHeight ? el.offsetHeight : 0)
    }, 0)
    const gaps = (belowBlocks?.length || 0) * 14
    const c = Math.max(48, bottom - 16 - contentTop - below - gaps - reserve)

    const base = contentEl.getBoundingClientRect().top
    let lastFit = 0
    const part2 = []
    for (const child of contentEl.children) {
      const rect = child.getBoundingClientRect()
      const childBottom = rect.top + rect.height - base
      if (childBottom > c) {
        part2.push(child.outerHTML)
      } else {
        lastFit = childBottom
      }
    }
    const part2Str = part2.join('')
    // When content overflows, snap the cap to the bottom of the last block that
    // fully fits so no block is partially clipped on this page.
    const cap = part2.length ? Math.max(48, lastFit) : c

    const prev = committed.current
    if (prev.cap !== cap || prev.part2Html !== part2Str) {
      committed.current = { cap, part2Html: part2Str }
      setCap(cap)
      setPart2Html(part2Str)
    }
  }, [contentRef, bottomRef, belowBlocks, reserve])

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
    let observer
    if (contentEl && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(check)
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
