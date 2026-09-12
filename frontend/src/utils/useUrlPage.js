import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

function parsePage(value) {
  const n = parseInt(value || '', 10)
  return Number.isFinite(n) && n > 1 ? n : 1
}

export default function useUrlPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(() => parsePage(searchParams.get('page')))

  useEffect(() => {
    const target = page > 1 ? String(page) : null
    if (searchParams.get('page') !== target) {
      const next = new URLSearchParams(searchParams)
      if (page > 1) next.set('page', String(page))
      else next.delete('page')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return [page, setPage]
}