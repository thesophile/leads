import { useState } from 'react'

function isSame(a, b) {
  if (a === b) return true
  return Object.keys(a).every((key) => a[key] === b[key])
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