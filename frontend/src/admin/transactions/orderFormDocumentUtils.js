export function wrappableHtml(html) {
  return String(html || '').replace(/&nbsp;/gi, ' ')
}

export function orderBarcodeValue(id) {
  const digits = String(id || '').replace(/\D/g, '')
  return (digits || id).slice(0, 14)
}

export function clientOrderLink(clientToken) {
  if (!clientToken) return ''
  return `${window.location.origin}/order/${clientToken}`
}