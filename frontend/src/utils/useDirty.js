import { useState } from 'react'

function isSame(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a[key] === b[key])
}

export default function useDirty(open, values) {
  const [baseline, setBaseline] = useState(null)
  const [prevOpen, setPrevOpen] = useState(false)

  if (open !== prevOpen) {
    setPrevOpen(open)
    setBaseline(open ? values : null)
  }

  const dirty = open && baseline !== null && !isSame(baseline, values)
  const reset = () => setBaseline(values)

  return { dirty, reset }
}