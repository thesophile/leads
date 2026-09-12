import { useEffect, useState } from 'react'
import { api } from '../api/client'

const DEFAULT_PAGE_SIZE = 50

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Fetch every page of a paginated endpoint (for PDF exports / full-set reads).
 * ``params`` should exclude ``page`` / ``page_size``; pages are walked with the
 * same 50-row page size the app uses.
 */
export async function fetchAllPaged(url, params = {}, pageSize = DEFAULT_PAGE_SIZE) {
  const collected = []
  let page = 1
  for (;;) {
    const data = await api.get(url, { params: { ...params, page, page_size: pageSize } })
    const results = Array.isArray(data?.results) ? data.results : []
    collected.push(...results)
    if (!data || collected.length >= (data.count || 0) || results.length === 0) break
    page += 1
  }
  return collected
}

/**
 * Fetch one 50-row page from a paginated API endpoint, refetching whenever
 * the (serialized) `params` or the current `page` change. Exposes the DRF-style
 * envelope (`{count, page, page_size, results}`) plus any `counts` / `facets`
 * the endpoint returns for KPI cards and filter pickers.
 *
 * `onData(results, envelope)` / `onError(message)` are async callbacks fired
 * after each successful/failed fetch — handy for syncing a local list that is
 * also edited optimistically by the screen.
 */
export default function usePagedList({
  url,
  params = {},
  pageSize = DEFAULT_PAGE_SIZE,
  onData,
  onError,
}) {
  const paramsKey = JSON.stringify(params)
  const [page, setPage] = useState(1)
  const [prevKey, setPrevKey] = useState(paramsKey)
  if (prevKey !== paramsKey) {
    // Adjusting state during render to reset the page when filters change.
    setPrevKey(paramsKey)
    setPage(1)
  }
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [counts, setCounts] = useState({})
  const [facets, setFacets] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .get(url, { params: { ...params, page, page_size: pageSize } })
      .then((data) => {
        if (cancelled) return
        setRows(Array.isArray(data?.results) ? data.results : [])
        setCount(data?.count ?? 0)
        setCounts(data?.counts ?? {})
        setFacets(data?.facets ?? {})
        setError('')
        if (typeof onData === 'function') onData(data?.results || [], data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        if (typeof onError === 'function') onError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey, page, pageSize, nonce])

  return {
    rows,
    count,
    counts,
    facets,
    loading,
    error,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    setPage,
    refetch: () => setNonce((n) => n + 1),
  }
}