export function wrappableHtml(html) {
  return String(html || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<p(?:\s[^>]*)?>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, '<p class="rich-blank"><br></p>')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Render stored rich text as plain text: drop all formatting/markup but keep the
// author's line breaks. Consecutive blank lines collapse to one.
export function htmlToPlainLines(html) {
  const raw = String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&mdash;/gi, '\u2014')
    .replace(/&ndash;/gi, '\u2013')
    .replace(/\r\n?/g, '\n')

  const lines = []
  for (const line of raw.split('\n')) {
    const text = line.trim()
    if (text === '' && (lines.length === 0 || lines[lines.length - 1] === '')) continue
    lines.push(text)
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

export function linesToHtml(lines) {
  return lines.map((line) => `<div>${line ? escapeHtml(line) : '&nbsp;'}</div>`).join('')
}

export function richTextCharCount(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length
}

export function limitRichHtml(html, limit) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_ALL)
  const nodes = []
  let node
  while ((node = walker.nextNode())) nodes.push(node)
  let count = 0
  let cutIdx = -1
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.nodeType === 3) {
      const len = n.textContent.length
      if (count + len > limit) {
        n.textContent = n.textContent.slice(0, Math.max(0, limit - count))
        cutIdx = i
        break
      }
      count += len
    }
  }
  if (cutIdx >= 0) {
    for (let i = cutIdx + 1; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.parentNode) n.parentNode.removeChild(n)
    }
  }
  return div.innerHTML
}

export const TERMS_SUMMARY_RENDER_FONT =
  '400 12.5px Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'

let _measureCtx = null
let _termsSummaryMaxLinePx = null

export function measureTextWidth(text) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d')
  _measureCtx.font = TERMS_SUMMARY_RENDER_FONT
  return _measureCtx.measureText(String(text || '')).width
}

export function termsSummaryMaxLinePx() {
  if (_termsSummaryMaxLinePx == null) _termsSummaryMaxLinePx = measureTextWidth('WWWWWWWWWWWWWWWW')
  return _termsSummaryMaxLinePx
}

const RICH_LINE_BREAK_RE = /^<\/\s*(p|div|h[1-6]|li|blockquote|pre|tr|section|article)\s*>$/i
const RICH_BR_RE = /^<\s*br(\s[^>]*)?\/?\s*>$/i

function plainMeasureText(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&#x27;/gi, "'")
}

function fitTextPrefixLen(text, budgetPx) {
  if (budgetPx <= 0) return 0
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (measureTextWidth(plainMeasureText(text.slice(0, mid))) <= budgetPx) lo = mid
    else hi = mid - 1
  }
  return lo
}

// Trim rich text so it fits within a hard limit of whole lines, each line no
// wider than maxLinePx. Uses the same line-break rules as htmlToPlainLines
// (<br>, closing tags of p/div/h*/li/etc.) and measures rendered width with
// the font the terms summary is drawn with in the proposal form.
export function trimRichHtmlToLines(html, maxLines, maxLinePx) {
  const tokens = String(html || '').split(/(<[^>]+>)/g)
  const out = []
  let lineIndex = 0
  let linePlain = ''
  let cut = false

  const hasContentAhead = (fromIndex) => {
    for (let i = fromIndex; i < tokens.length; i++) {
      const t = tokens[i]
      if (!t || t.startsWith('<')) continue
      if (plainMeasureText(t).trim() !== '') return true
    }
    return false
  }

  for (let i = 0; i < tokens.length && !cut; i++) {
    const token = tokens[i]
    if (!token) continue

    if (token.startsWith('<')) {
      const isBr = RICH_BR_RE.test(token)
      const isClosingBreak = RICH_LINE_BREAK_RE.test(token)
      if (isBr || isClosingBreak) {
        if (lineIndex + 1 > maxLines) {
          break
        }
        if (lineIndex + 1 >= maxLines && hasContentAhead(i + 1)) {
          break
        }
        out.push(token)
        lineIndex += 1
        linePlain = ''
      } else {
        out.push(token)
      }
      continue
    }

    const segments = token.split('\n')
    for (let s = 0; s < segments.length && !cut; s++) {
      const seg = segments[s]
      if (seg) {
        if (lineIndex >= maxLines) {
          cut = true
          break
        }
        if (measureTextWidth(linePlain + plainMeasureText(seg)) > maxLinePx) {
          const budget = Math.max(0, maxLinePx - measureTextWidth(linePlain))
          const fit = fitTextPrefixLen(seg, budget)
          out.push(seg.slice(0, fit))
          cut = true
          break
        }
        out.push(seg)
        linePlain += plainMeasureText(seg)
      }
      if (s < segments.length - 1) {
        if (lineIndex + 1 >= maxLines) {
          cut = true
          break
        }
        out.push('<br>')
        lineIndex += 1
        linePlain = ''
      }
    }
  }

  return out.join('')
}

export function richTextLineCount(html) {
  return htmlToPlainLines(html).length
}

export function orderBarcodeValue(id) {
  const digits = String(id || '').replace(/\D/g, '')
  return (digits || id).slice(0, 14)
}

export function clientOrderLink(clientToken) {
  if (!clientToken) return ''
  return `${window.location.origin}/order/${clientToken}`
}