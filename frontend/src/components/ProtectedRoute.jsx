import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { can } from '../utils/permissions'

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false, perm }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-400">Loading workspace…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (superAdminOnly && !(user && user.is_superuser)) {
    return <Navigate to="/dashboard" replace />
  }

  if (perm && user && !can(user, perm)) {
    return <Navigate to="/dashboard" replace />
  }

  if (adminOnly && user && !can(user, 'staff.manage') && !user.is_superuser) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}