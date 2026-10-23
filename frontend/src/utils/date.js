export function localISO(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addMonths(date = new Date(), months = 3) {
  const d = new Date(date instanceof Date ? date.getTime() : date)
  const targetMonth = d.getMonth() + months
  d.setMonth(targetMonth)
  if (d.getMonth() !== (targetMonth % 12)) {
    d.setDate(0)
  }
  return localISO(d)
}