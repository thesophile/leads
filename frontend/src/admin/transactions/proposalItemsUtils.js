// Structured "service" and "text" blocks embedded in the Proposal in Detail
// HTML (termsConditions). They are stored as flat, regex-safe markup so the
// editor can split them out again and every renderer (print form, client page,
// email PDF) can lay them out as bold title + description + right-aligned
// amount.
//
//   <div class="proposal-item-service">
//     <span class="pi-title">Website Design</span>
//     <span class="pi-desc">5-page responsive website</span>
//     <span class="pi-amount">50000</span>
//   </div>
//   <div class="proposal-item-text"><span class="pi-text">Some text…</span></div>

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function amountDigits(value) {
  return String(value == null ? '' : value).replace(/[^0-9.]/g, '')
}

export function parseAmount(value) {
  const cleaned = amountDigits(value)
  if (!cleaned) return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

export function fmtAmount(n) {
  const rounded = Math.round(n * 100) / 100
  return rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function currencySymbol(raw) {
  const m = String(raw || '').match(/(₹|€|£|AED|\$)/)
  return m ? m[1] : '₹'
}

export function itemsTotal(items) {
  return (items || []).reduce(
    (sum, it) => sum + (it && it.type === 'service' ? parseAmount(it.amount) : 0),
    0
  )
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&#x27;/gi, "'")
}

// Split composed termsConditions HTML into a structured items array plus the
// remaining free-form rich-text HTML.
export function proposalItemsFromHtml(html) {
  const source = String(html || '')
  const items = []
  const freeParts = []
  const blockRe = /<div class="proposal-item-(service|text)">([\s\S]*?)<\/div>/g
  let last = 0
  let m
  while ((m = blockRe.exec(source))) {
    if (m.index > last) freeParts.push(source.slice(last, m.index))
    const kind = m[1]
    const fields = {}
    const spanRe = /<span class="pi-([a-z]+)">([\s\S]*?)<\/span>/g
    let s
    while ((s = spanRe.exec(m[2]))) fields[s[1]] = decodeHtml(s[2])
    if (kind === 'service') {
      items.push({
        type: 'service',
        title: fields.title || '',
        description: fields.desc || '',
        amount: String(fields.amount || '').replace(/[^0-9.]/g, ''),
      })
    } else {
      items.push({ type: 'text', text: fields.text || '' })
    }
    last = m.index + m[0].length
  }
  if (last < source.length) freeParts.push(source.slice(last))
  return { items, freeHtml: freeParts.join('') }
}

// Free-form HTML only, with any embedded item blocks dropped.
export function stripItems(html) {
  return proposalItemsFromHtml(html).freeHtml
}

// Compose the item markup that gets embedded into termsConditions.
export function buildItemsHtml(items) {
  return (items || [])
    .map((it) => {
      if (it && it.type === 'text') {
        const text = String(it.text || '').replace(/\r\n?/g, '\n')
        return `<div class="proposal-item-text"><span class="pi-text">${escapeHtml(text).replace(/\n/g, '<br/>')}</span></div>`
      }
      return `<div class="proposal-item-service"><span class="pi-title">${escapeHtml(
        it.title
      )}</span><span class="pi-desc">${escapeHtml(
        it.description
      )}</span><span class="pi-amount">${String(it.amount || '').replace(
        /[^0-9.]/g,
        ''
      )}</span></div>`
    })
    .join('')
}

// Printable HTML for the A4 document: bold title, description below, amount
// right-aligned in bold, a right-aligned total row, and every line so the
// amount never overlaps the text.
export function itemsPrintHtml(items, currency = '₹', totalFmt = '') {
  const rows = (items || [])
    .map((it) => {
      if (it && it.type === 'text') {
        return `<div style="font-size:13px;color:#334155;margin:10px 0;line-height:1.5;">${escapeHtml(
          it.text
        ).replace(/\n/g, '<br/>')}</div>`
      }
      return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:7px 0;border-bottom:1px solid #eef2f7;">
  <div style="flex:1;min-width:0;">
    <div style="font-weight:700;font-size:13.5px;color:#0f172a;">${escapeHtml(
      it.title
    )}</div>
    <div style="font-size:12.5px;color:#475569;margin-top:2px;line-height:1.4;">${escapeHtml(
      it.description
    ).replace(/\n/g, '<br/>')}</div>
  </div>
  <div style="flex-shrink:0;font-weight:700;font-size:13.5px;color:#0f172a;text-align:right;white-space:nowrap;">${currency}${fmtAmount(
        parseAmount(it.amount)
      )}</div>
</div>`
    })
    .join('')
  if (!rows) return ''
  return `${rows}${
    totalFmt !== ''
      ? `<div style="display:flex;justify-content:flex-end;align-items:center;gap:16px;padding-top:10px;">
  <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Total</span>
  <span style="font-weight:800;font-size:14px;color:#0f172a;">${currency}${totalFmt}</span>
</div>`
      : ''
  }`
}