import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, clearAuth, getStoredTokens, persistAuth, setAuthFailureHandler } from '../api/client'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const login = useCallback(async ({ email, password, remember = true }) => {
    const data = await api.post('/auth/login/', { email, password }, { auth: false })
    persistAuth(data.tokens.access, data.tokens.refresh, remember)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register/', payload, { auth: false })
    persistAuth(data.tokens.access, data.tokens.refresh, true)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    const { refresh } = getStoredTokens()
    try {
      if (refresh) await api.post('/auth/logout/', { refresh })
    } catch {
      // token may already be invalid — clear locally regardless
    }
    clearAuth()
    setUser(null)
  }, [])

  const changePassword = useCallback(async (payload) => {
    await api.post('/auth/change-password/', payload)
  }, [])

  const requestPasswordReset = useCallback(
    (email) => api.post('/auth/password-reset/request/', { email }, { auth: false }),
    []
  )

  const confirmPasswordReset = useCallback(
    (payload) => api.post('/auth/password-reset/confirm/', payload, { auth: false }),
    []
  )

  // If a token refresh fails anywhere, drop the user (session expired)
  useEffect(() => {
    setAuthFailureHandler(() => setUser(null))
  }, [])

  // On app load: restore the session (keep-signed-in) via /me
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!getStoredTokens().access) {
        setLoading(false)
        return
      }
      try {
        const me = await api.get('/auth/me/')
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      changePassword,
      requestPasswordReset,
      confirmPasswordReset,
    }),
    [user, loading, login, register, logout, changePassword, requestPasswordReset, confirmPasswordReset]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
