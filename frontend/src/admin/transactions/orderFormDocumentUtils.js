export function wrappableHtml(html) {
  return String(html || '').replace(/&nbsp;/gi, ' ')
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

export function orderBarcodeValue(id) {
  const digits = String(id || '').replace(/\D/g, '')
  return (digits || id).slice(0, 14)
}

export function clientOrderLink(clientToken) {
  if (!clientToken) return ''
  return `${window.location.origin}/order/${clientToken}`
}