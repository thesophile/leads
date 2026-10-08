// Apply ``patch`` to the matching row and float it to the top of the list.
// This is local-only so the edited row shows at the top instantly; the server's
// activity-based ordering catches up the rest on the next load/refresh.
export function moveToTop(list, id, patch) {
  const next = list.map((item) => (item.id === id ? { ...item, ...patch } : item))
  const index = next.findIndex((item) => item.id === id)
  if (index > 0) {
    const [row] = next.splice(index, 1)
    next.unshift(row)
  }
  return next
}
