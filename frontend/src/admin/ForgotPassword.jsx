import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import PasswordInput from '../components/PasswordInput'

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100'

export default function ForgotPassword() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth()

  const [step, setStep] = useState(1) // 1 = request code, 2 = set new password
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequest(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setStep(2)
      setSuccess(
        'If an account exists for this email, a reset code has been sent. Check your inbox (or the terminal running Django in development).'
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setError('')
    if (password !== password2) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await confirmPasswordReset({ email, token, new_password: password })
      setSuccess('Password reset successful. You can now sign in with your new password.')
      setPassword('')
      setPassword2('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Reset your password</h2>
            <p className="mt-1 text-sm text-slate-500">
              {step === 1
                ? 'Enter your account email and we will send you a one-time reset code.'
                : 'Enter the code you received and choose a new password.'}
            </p>
          </div>

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequest} noValidate className="space-y-3.5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@company.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:from-brand-700 hover:to-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} noValidate className="space-y-3.5">
              <div>
                <label htmlFor="token" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Reset code
                </label>
                <input
                  id="token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="e.g. ab12-cd34-ef56"
                />
              </div>
              <PasswordInput
                id="password"
                label="New password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                className={inputClass}
                placeholder="At least 8 characters"
              />
              <PasswordInput
                id="password2"
                label="Confirm new password"
                value={password2}
                onChange={setPassword2}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Repeat your new password"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:from-brand-700 hover:to-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-slate-500">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
