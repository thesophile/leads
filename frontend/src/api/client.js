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
    if (!refresh) throw new Error('No refresh token available')
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) throw new Error('Token refresh failed')
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

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const config = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  }
  if (body !== undefined) config.body = JSON.stringify(body)

  const { access, refresh } = getStoredTokens()
  if (auth && access) config.headers.Authorization = `Bearer ${access}`

  let res = await fetch(url, config)

  if (res.status === 401 && auth && refresh) {
    try {
      const newAccess = await refreshAccessToken()
      config.headers.Authorization = `Bearer ${newAccess}`
      res = await fetch(url, config)
    } catch {
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
}
