import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// Grid icon matching the screenshot (3x3 rounded squares)
function LeadsGridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand-600" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="3" width="4.5" height="4.5" rx="1" />
      <rect x="16.5" y="3" width="4.5" height="4.5" rx="1" />
      <rect x="3" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="16.5" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="3" y="16.5" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="16.5" width="4.5" height="4.5" rx="1" />
      <rect x="16.5" y="16.5" width="4.5" height="4.5" rx="1" />
    </svg>
  )
}

function ChevronRightIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// Navigation structure matching the workflow & screenshot
const MENU_SECTIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    isDirect: true,
  },
  {
    id: 'master-data',
    label: 'Master Data',
    items: [
      { id: 'categories', label: 'Categories', path: '/categories' },
      { id: 'sources', label: 'Sources', path: '/sources' },
      { id: 'branches', label: 'Branches', path: '/branches' },
      { id: 'staff', label: 'Staff', path: '/staff' },
    ],
  },
  {
    id: 'transaction',
    label: 'Transaction',
    items: [
      { id: 'raw-data', label: 'Raw Data', path: '/raw-leads' },
      { id: 'tele-call', label: 'Tele Call', path: '/tele-calling' },
      { id: 'quotations', label: 'Manage Quotation', path: '/quotations' },
      { id: 'orders', label: 'Manage Order', path: '/orders' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      { id: 'raw-data-register', label: 'Raw Data Register', path: '/raw-data-register' },
      { id: 'telecalling-register', label: 'Telecalling Register', path: '/telecalling-register' },
      { id: 'quotation-submitted-register', label: 'Quotation Submitted Register', path: '/quotation-submitted-register' },
      { id: 'order-received-register', label: 'Order Received Register', path: '/order-received-register' },
      { id: 'order-progress-register', label: 'Order Progress Register', path: '/order-progress-register' },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    items: [
      { id: 'settings', label: 'Settings', path: '/settings' },
      { id: 'notifications', label: 'Notifications', path: '/notifications' },
    ],
  },
]

export default function Sidebar({
  mobileOpen = false,
  onCloseMobile,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  // Track hovered section
  const [hoveredSection, setHoveredSection] = useState(null)

  // Track if user explicitly closed a section while hovering on it
  const [explicitlyClosedHover, setExplicitlyClosedHover] = useState(null)
  
  // Track permanently pinned/clicked sections
  const [openSections, setOpenSections] = useState(() => {
    const activeSection = MENU_SECTIONS.find((sec) =>
      sec.items?.some((item) => item.path === window.location.pathname)
    )
    return activeSection ? [activeSection.id] : ['transaction']
  })

  function toggleSection(id, isCurrentlyOpen) {
    if (isCurrentlyOpen) {
      // Close it
      setOpenSections((prev) => prev.filter((item) => item !== id))
      setExplicitlyClosedHover(id)
    } else {
      // Open it
      setOpenSections((prev) => (prev.includes(id) ? prev : [...prev, id]))
      setExplicitlyClosedHover(null)
    }
  }

  function handleNavigate(path, sectionId) {
    if (sectionId) {
      setOpenSections((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]))
      setExplicitlyClosedHover(null)
    }
    navigate(path)
    onCloseMobile?.()
  }

  function handleLogout() {
    navigate('/login')
    onCloseMobile?.()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-48 flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out lg:translate-x-0 lg:hover:w-[204px] lg:hover:shadow-lg lg:hover:shadow-slate-300/30 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Header Branding */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-3.5">
          <LeadsGridIcon />
          <span className="text-base font-extrabold tracking-tight text-slate-900">
            LEADS
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2 py-3.5">
          <ul className="space-y-1.5 font-medium">
            {MENU_SECTIONS.map((section) => {
              if (section.isDirect) {
                const isActive =
                  location.pathname === section.path ||
                  (section.path === '/' && location.pathname === '/dashboard')

                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(section.path)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13.5px] transition-colors ${
                        isActive
                          ? 'bg-brand-50/80 font-semibold text-brand-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{section.label}</span>
                    </button>
                  </li>
                )
              }

              const hasActiveChild = section.items?.some(
                (item) => location.pathname === item.path
              )

              // Compute open state with priority to explicit click-close during hover
              const isTemporarilyClosed = explicitlyClosedHover === section.id
              const isHovered = hoveredSection === section.id
              const isPinned = openSections.includes(section.id) || hasActiveChild

              const isOpen = !isTemporarilyClosed && (isHovered || isPinned)

              return (
                <li
                  key={section.id}
                  onMouseEnter={() => {
                    setHoveredSection(section.id)
                    setExplicitlyClosedHover(null)
                  }}
                  onMouseLeave={() => {
                    setHoveredSection(null)
                    setExplicitlyClosedHover(null)
                  }}
                >
                  {/* Category Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id, isOpen)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13.5px] transition-colors ${
                      hasActiveChild
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{section.label}</span>
                    <ChevronRightIcon
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-90 text-slate-600' : ''
                      }`}
                    />
                  </button>

                  {/* Smooth Animated Submenu Items */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen
                        ? 'grid-rows-[1fr] opacity-100 mt-0.5'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ul className="space-y-0.5 pl-3 pr-1 py-0.5">
                        {section.items.map((item) => {
                          const isChildActive = location.pathname === item.path

                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => handleNavigate(item.path, section.id)}
                                className={`group relative flex w-full items-center rounded-lg px-2.5 py-1.5 text-[12.5px] transition-all duration-150 ${
                                  isChildActive
                                    ? 'bg-brand-50/80 font-semibold text-brand-600'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <span className="truncate">{item.label}</span>
                                {isChildActive && (
                                  <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-brand-600" />
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer with Logout Button */}
        <div className="shrink-0 border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/80 bg-white py-2 text-[13px] font-semibold text-brand-600 shadow-2xs transition-all hover:bg-brand-50 hover:border-brand-600 active:scale-[0.99]"
          >
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}