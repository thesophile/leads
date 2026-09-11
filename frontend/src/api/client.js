const API_BASE = '/api'
const ACCESS_KEY = 'leads_access'
const REFRESH_KEY = 'leads_refresh'

let onAuthFailure = null
let refreshPromise = null

export function setAuthFailureHandler(fn) {
  onAuthFailure = fn
}

export function getStoredTokens() {
  return {
    access: localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY),
    refresh: localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY),
  }
}

function currentStorage() {
  if (localStorage.getItem(ACCESS_KEY) || localStorage.getItem(REFRESH_KEY)) {
    return localStorage
  }
  return sessionStorage
}

export function persistAuth(access, refresh, remember) {
  const storage = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  other.removeItem(ACCESS_KEY)
  other.removeItem(REFRESH_KEY)
  storage.setItem(ACCESS_KEY, access)
  if (refresh) storage.setItem(REFRESH_KEY, refresh)
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const { refresh } = getStoredTokens()
    if (!refresh) {
      const err = new Error('No refresh token available')
      err.isInvalid = true
      throw err
    }
    let res
    try {
      res = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
    } catch {
      // Network failure / server unreachable: the session is still valid,
      // do not treat this as session expiry.
      throw new Error('Unable to reach the server while refreshing your session.')
    }
    if (res.status === 400 || res.status === 401) {
      const err = new Error('Token refresh failed')
      err.isInvalid = true
      throw err
    }
    if (!res.ok) {
      throw new Error('Token refresh failed')
    }
    const data = await res.json()
    const storage = currentStorage()
    storage.setItem(ACCESS_KEY, data.access)
    return data.access
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

function extractMessage(data) {
  if (!data) return ''
  if (typeof data === 'string') return data
  if (data.detail) {
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) return data.detail[0]
    return JSON.stringify(data.detail)
  }
  if (data.non_field_errors && Array.isArray(data.non_field_errors)) return data.non_field_errors[0]
  const firstKey = Object.keys(data)[0]
  if (!firstKey) return ''
  const val = data[firstKey]
  if (Array.isArray(val)) return `${firstKey}: ${val[0]}`
  if (typeof val === 'string') return `${firstKey}: ${val}`
  return JSON.stringify(data)
}

async function request(path, { method = 'GET', body, headers = {}, auth = true, params = null } = {}) {
  let url = path.startsWith('http') ? path : `${API_BASE}${path}`
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    )
    if (String(qs)) url += `?${qs}`
  }
  const config = {
    method,
    headers: { ...headers },
  }
  const isForm = body instanceof FormData
  if (!isForm) config.headers['Content-Type'] = 'application/json'
  if (body !== undefined) config.body = isForm ? body : JSON.stringify(body)

  const { access, refresh } = getStoredTokens()
  if (auth && access) config.headers.Authorization = `Bearer ${access}`

  let res = await fetch(url, config)

  if (res.status === 401 && auth && refresh) {
    let newAccess
    try {
      newAccess = await refreshAccessToken()
    } catch (refreshErr) {
      // Only an invalid/expired refresh token means the session is really over.
      // Network problems or server errors must NOT clear a still-valid session.
      if (refreshErr.isInvalid) {
        clearAuth()
        onAuthFailure?.()
      }
      throw new ApiError(
        refreshErr.isInvalid
          ? 'Your session has expired. Please sign in again.'
          : 'Unable to reach the server. Your session is still valid — please try again.',
        401
      )
    }
    config.headers.Authorization = `Bearer ${newAccess}`
    res = await fetch(url, config)
    if (res.status === 401) {
      // Refresh succeeded but the request is still rejected: the session is
      // genuinely dead (e.g. user disabled). Log out rather than leaving a
      // half-alive session.
      clearAuth()
      onAuthFailure?.()
      throw new ApiError('Your session has expired. Please sign in again.', 401)
    }
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(extractMessage(data) || `Request failed (${res.status})`, res.status, data)
  }
  return data
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  download: async (path, fallbackName = 'download') => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`
    const { access } = getStoredTokens()
    const headers = access ? { Authorization: `Bearer ${access}` } : {}
    const res = await fetch(url, { headers })
    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try {
        message = extractMessage(await res.json()) || message
      } catch {
        // keep the default message for non-JSON failures
      }
      throw new ApiError(message, res.status)
    }
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const disposition = res.headers.get('Content-Disposition') || ''
    const fileMatch = disposition.match(/filename="?([^";]+)"?/i)
    link.href = objectUrl
    link.download = fileMatch ? fileMatch[1] : fallbackName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
    return true
  },
}
