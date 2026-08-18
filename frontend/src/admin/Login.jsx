import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

function BrandMark({ size = 40 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 7.2 5.2a2 2 0 0 0 2.6 0L20.5 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

function EyeIcon({ off = false }) {
  return off ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l16 16" />
      <path d="M9.6 5.7A9.6 9.6 0 0 1 12 5.5c5 0 8.6 4.2 9.5 6.5-.4.9-1.5 2.7-3.4 4.3M6.1 6.6C3.6 8.3 2.1 10.5 1.5 12c.9 2.3 4.5 6.5 10.5 6.5 2 0 3.8-.6 5.3-1.5" />
      <path d="M10 10.2a2.5 2.5 0 0 0 3.5 3.6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const TYPE_WORDS = ['Client.', 'Prospect.', 'Deal.']

function useTypewriter(words, typeSpeed = 90, deleteSpeed = 50, holdTime = 1700) {
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[index % words.length]

    if (!deleting && text === word) {
      const id = setTimeout(() => setDeleting(true), holdTime)
      return () => clearTimeout(id)
    }

    if (deleting && text === '') {
      const id = setTimeout(() => {
        setIndex((i) => (i + 1) % words.length)
        setDeleting(false)
      }, deleteSpeed)
      return () => clearTimeout(id)
    }

    const id = setTimeout(
      () => {
        const next = deleting
          ? word.slice(0, text.length - 1)
          : word.slice(0, text.length + 1)
        setText(next)
      },
      deleting ? deleteSpeed : typeSpeed,
    )
    return () => clearTimeout(id)
  }, [text, deleting, index, words, typeSpeed, deleteSpeed, holdTime])

  return { text }
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

function useCountUp(target, duration = 1800, live = false) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  useEffect(() => {
    if (!live) return undefined
    const id = setInterval(() => {
      setValue((v) => (Math.random() < 0.4 ? v + 1 : v))
    }, 4500)
    return () => clearInterval(id)
  }, [live])

  return value
}

function StatCard({ value, label, live = false }) {
  const count = useCountUp(value, 1800, live)

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-2xl font-bold text-white">{count.toLocaleString('en-US')}</p>
      <p className="mt-0.5 text-xs font-medium text-white/70">{label}</p>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { text: typed } = useTypewriter(TYPE_WORDS)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    try {
      await login({ email, password, remember })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.')
      setLoading(false)
    }
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand-400/30 blur-3xl" />
        <div className="pointer-events-none absolute right-16 top-1/3 h-40 w-40 rounded-full bg-brand-300/20 blur-2xl" />

        {/* logo */}
        <div className="relative flex items-center gap-2.5 text-white">
          <BrandMark size={32} />
          <div className="text-xl font-bold tracking-wide">LEADS</div>
        </div>

        {/* headline + copy */}
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Every{' '}
            <span className="text-white drop-shadow-sm">
              {typed}
              <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] animate-pulse rounded-full bg-white shadow-sm" />
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Capture, call, qualify and convert leads through a single connected
            workspace — from first enquiry to completed order.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <StatCard value={5736} label="Total Leads" live />
            <StatCard value={680} label="Quotations" live />
            <StatCard value={198} label="Orders" live />
          </div>
        </div>

        {/* footer quote */}
        <div className="relative flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
            S
          </div>
          <p className="text-sm italic text-white/80">
            Priority tells you how urgently a lead needs attention. Status tells
            you where it is in the journey.
          </p>
        </div>
      </aside>

      {/* ---------- Form panel ---------- */}
      <main className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-50 px-5 py-6 sm:px-8">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-100/70 blur-3xl" />

        <div className="relative w-full max-w-md">
          {/* mobile-only brand */}
          <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <div className="text-brand-600">
              <BrandMark size={28} />
            </div>
            <span className="text-lg font-bold text-slate-900">LEADS</span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to your Leads workspace to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              {/* email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email or Username
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <MailIcon />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="username"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full rounded-xl border bg-white py-2 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 ${
                      error && !email.trim()
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
                    }`}
                  />
                </div>
              </div>

              {/* password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <LockIcon />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded-xl border bg-white py-2 pl-11 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 ${
                      error && !password
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600"
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </div>

              {/* remember + error */}
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md border border-slate-300 bg-white text-transparent transition peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white">
                    <CheckIcon />
                  </span>
                  <span>Remember me</span>
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Spinner /> Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* admin register prompt */}
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-center">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Register your company?</span>{' '}
                <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                  Create admin account
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Leads — Programers International. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  )
}