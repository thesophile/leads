import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import PasswordInput from '../components/PasswordInput'

const inputClass = (hasError) =>
  `w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
  }`

export default function Register() {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()

  const [company, setCompany] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!company.trim()) {
      setError('Please enter your company name.')
      return
    }
    if (password !== password2) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await register({ company, name, email, phone, password, password2 })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to create your admin account.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Register your company</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create the admin account for your organization. Admins can then add
              their staff members.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <div>
              <label htmlFor="company" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Company Name
              </label>
              <input
                id="company"
                type="text"
                autoComplete="organization"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass(!company)}
                placeholder="e.g. Acme Software"
              />
            </div>

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Admin Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass(!name)}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass(!email)}
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass(false)}
                placeholder="Optional"
              />
            </div>

            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              className={inputClass(false)}
              placeholder="At least 8 characters"
            />

            <PasswordInput
              id="password2"
              label="Confirm Password"
              value={password2}
              onChange={setPassword2}
              autoComplete="new-password"
              className={inputClass(password2 !== '' && password !== password2)}
              placeholder="Repeat your password"
            />

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Creating admin account…' : 'Register company'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Staff accounts are created by your company admin — employees do not self-register.
        </p>
      </div>
    </div>
  )
}
