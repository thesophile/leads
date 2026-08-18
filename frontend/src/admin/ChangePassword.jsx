import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../Layout/Layout'
import { useAuth } from '../context/auth-context'

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100'

export default function ChangePassword() {
  const { changePassword } = useAuth()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== newPassword2) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      })
      setSuccess('Password changed successfully.')
      setOldPassword('')
      setNewPassword('')
      setNewPassword2('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Change Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Update your account password. You will stay signed in on this device.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
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

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <div>
              <label htmlFor="old" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Current password
              </label>
              <input
                id="old"
                type="password"
                autoComplete="current-password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="new" className="mb-1.5 block text-sm font-semibold text-slate-700">
                New password
              </label>
              <input
                id="new"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label htmlFor="new2" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Confirm new password
              </label>
              <input
                id="new2"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                className={inputClass}
                placeholder="Repeat your new password"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
              <Link
                to="/settings"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
