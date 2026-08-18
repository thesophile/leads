import { useState } from 'react'

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

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  autoComplete,
  className = '',
  hasError = false,
}) {
  const [show, setShow] = useState(false)

  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} pr-11!`}
          placeholder={placeholder}
          aria-invalid={hasError || undefined}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600"
        >
          <EyeIcon off={show} />
        </button>
      </div>
    </div>
  )
}
