import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import Layout from '../../Layout/Layout'

function BuildingIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
      <path d="M16 8h3a1 1 0 0 1 1 1v12" />
      <path d="M7 7h2M7 11h2M7 15h2M11 7h2M11 11h2M11 15h2M3 21h19" />
    </svg>
  )
}

function MailIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )
}

function PhoneIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function PinIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function GlobeIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-7 w-7 text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

const inputClass =
  'peer relative z-0 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 transition-all focus:outline-none focus:ring-4 focus:border-brand-500 focus:ring-brand-500/10'

function Field({ label, id, value, onChange, type = 'text', icon, textarea = false }) {
  const common = `${inputClass} ${textarea ? 'resize-none' : ''}`
  return (
    <div className="relative mt-2">
      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-start pt-3 pl-3 text-slate-400">
        {icon}
      </span>
      {textarea ? (
        <textarea
          id={id}
          rows={3}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={common}
        />
      ) : (
        <input
          id={id}
          type={type}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={common}
        />
      )}
      <label
        htmlFor={id}
        className={`absolute left-8 -top-2 z-10 bg-white px-1 text-[10px] font-medium text-slate-500 transition-all pointer-events-none ${
          textarea ? 'top-2' : ''
        } peer-placeholder-shown:top-2 peer-placeholder-shown:text-xs peer-placeholder-shown:text-slate-400 peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-brand-600`}
      >
        {label}
      </label>
    </div>
  )
}

const emptyForm = { name: '', email: '', phone: '', address: '', website: '' }

export default function Company() {
  const [formData, setFormData] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchCompany() {
      try {
        const company = await api.get('/auth/company/')
        if (!cancelled) {
          setFormData({
            name: company.name || '',
            email: company.email || '',
            phone: company.phone || '',
            address: company.address || '',
            website: company.website || '',
          })
        }
      } catch (err) {
        if (!cancelled) {
          if (err.status === 404) setNotFound(true)
          else setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCompany()
    return () => {
      cancelled = true
    }
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Company name is required.')
      return
    }

    setSaving(true)
    try {
      const updated = await api.patch('/auth/company/', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        website: formData.website.trim(),
      })
      setFormData({
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
        address: updated.address || '',
        website: updated.website || '',
      })
      setNotFound(false)
      showToast('Company details saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
            {toast}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-14">
            <SpinnerIcon />
            <span className="mt-2 text-xs font-semibold text-slate-600">Loading company data...</span>
          </div>
        ) : notFound ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <BuildingIcon className="mx-auto h-8 w-8 text-slate-300" />
            <h2 className="mt-3 text-sm font-bold text-slate-900">No company linked</h2>
            <p className="mt-1 text-xs text-slate-400">
              Your account is not linked to a company. Contact your administrator.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <BuildingIcon />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Company Details</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Manage the profile of your own company
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    label="Company Name"
                    id="company_name_input"
                    value={formData.name}
                    onChange={(v) => setFormData({ ...formData, name: v })}
                    icon={<BuildingIcon />}
                  />
                </div>
                <Field
                  label="Primary Email"
                  id="company_email_input"
                  type="email"
                  value={formData.email}
                  onChange={(v) => setFormData({ ...formData, email: v })}
                  icon={<MailIcon />}
                />
                <Field
                  label="Phone"
                  id="company_phone_input"
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                  icon={<PhoneIcon />}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Website"
                    id="company_website_input"
                    type="url"
                    value={formData.website}
                    onChange={(v) => setFormData({ ...formData, website: v })}
                    icon={<GlobeIcon />}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Address"
                    id="company_address_input"
                    value={formData.address}
                    onChange={(v) => setFormData({ ...formData, address: v })}
                    icon={<PinIcon />}
                    textarea
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-6 py-2 text-xs font-semibold text-white shadow-md shadow-brand-600/10 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <SaveIcon />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  )
}
