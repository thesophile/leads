import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../context/auth-context'

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  // When the active screen's Refresh button runs, fade its table out to blank
  // and back in so the refresh is clearly communicated, smoothly and quickly.
  useEffect(() => {
    function setTablesFading(out) {
      document.querySelectorAll('main table').forEach((table) => {
        table.classList.toggle('refresh-fading', out)
      })
    }
    const onOut = () => setTablesFading(true)
    const onIn = () => setTablesFading(false)
    window.addEventListener('leads:refresh-out', onOut)
    window.addEventListener('leads:refresh-in', onIn)
    return () => {
      window.removeEventListener('leads:refresh-out', onOut)
      window.removeEventListener('leads:refresh-in', onIn)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:pl-48">
        {/* Mobile top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                aria-label="Go to dashboard"
                className="text-base font-extrabold tracking-tight text-slate-900"
              >
                LEADS
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell asButtonClassName="p-1.5" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
              {user?.initials || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content Rendered via children prop */}
        <main className="flex-1 p-3 sm:p-4 lg:p-5">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}
