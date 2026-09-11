import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'

const ATTACHMENT_TYPES = ['SRS Document', 'Business Card', 'Voice Clip', 'Other']

const TYPE_STYLES = {
  'SRS Document': 'bg-blue-50 text-blue-700 border-blue-200',
  'Business Card': 'bg-violet-50 text-violet-700 border-violet-200',
  'Voice Clip': 'bg-rose-50 text-rose-700 border-rose-200',
  Other: 'bg-slate-100 text-slate-700 border-slate-200',
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function UploadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileIcon({ type, className = 'h-3.5 w-3.5' }) {
  const common = {
    viewBox: '0 0 24 24',
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  if (type === 'Voice Clip') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    )
  }
  if (type === 'Business Card') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ErrorIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function ClientUpload() {
  const { token } = useParams()
  const fileInputRef = useRef(null)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedType, setSelectedType] = useState('SRS Document')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState(null)

  function showMessage(msg, kind = 'success') {
    setUploadMessage({ msg, kind })
    setTimeout(() => setUploadMessage(null), 4000)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await api.get(`/transactions/public/client-details/${encodeURIComponent(token)}/`)
        if (!cancelled) setData(d)
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  function handleSelect(e) {
    setSelectedFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  async function handleUpload() {
    if (!selectedFiles.length || uploading) return
    setUploading(true)
    setUploadMessage(null)
    const original = selectedFiles
    try {
      for (const file of original) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', selectedType)
        await api.post(
          `/transactions/public/client-details/${encodeURIComponent(token)}/attachments/`,
          fd
        )
      }
      const d = await api.get(`/transactions/public/client-details/${encodeURIComponent(token)}/`)
      setData(d)
      setSelectedFiles([])
      showMessage(
        original.length === 1
          ? `✓ ${original[0].name} uploaded successfully.`
          : `✓ ${original.length} documents uploaded successfully.`
      )
    } catch (err) {
      showMessage(`✗ ${err.message || 'Upload failed. Please try again.'}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-400">Loading upload page…</p>
        </div>
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ErrorIcon />
          </div>
          <h1 className="mt-3 text-sm font-bold text-slate-900">Link unavailable</h1>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{loadError}</p>
          <p className="mt-2 text-xs text-slate-400">Please contact the sender for a fresh link.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        {/* Branding header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            {data.companyLogo ? (
              <img
                src={data.companyLogo}
                alt={data.companyName || 'Company logo'}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <span className="text-sm font-black uppercase tracking-wider text-slate-800">
                {data.companyName || 'Company'}
              </span>
            )}
            <div className="border-l border-slate-200 pl-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                Document Upload
              </p>
              <p className="font-mono text-xs font-bold text-slate-900">{data.orderNo || data.id}</p>
            </div>
          </div>
        </div>

        {uploadMessage && (
          <div
            className={`mt-4 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-sm ${
              uploadMessage.kind === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                uploadMessage.kind === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {uploadMessage.kind === 'error' ? (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <CheckIcon className="h-3 w-3" />
              )}
            </span>
            {uploadMessage.msg}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UploadIcon />
            </span>
            <div>
              <h1 className="text-sm font-bold text-slate-900">
                Hello{data.clientName ? ` ${data.clientName}` : ''}
              </h1>
              <p className="text-xs text-slate-500">
                Upload your documents for <span className="font-semibold">{data.company}</span>.
              </p>
            </div>
          </div>

          {/* Upload area */}
          <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
            <p className="text-xs font-semibold text-slate-700">Choose documents to upload</p>
            <p className="mt-1 text-[10.5px] text-slate-400 leading-relaxed">
              PDF, images (JPG/PNG) and audio clips — up to 10 MB each.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 transition cursor-pointer active:scale-95"
            >
              <UploadIcon className="h-3.5 w-3.5" />
              Select files
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white">
              <p className="px-3 pt-3 text-[11px] font-bold text-slate-700">
                {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
              </p>
              <ul className="mt-2 divide-y divide-slate-100">
                {selectedFiles.map((f) => (
                  <li key={`${f.name}-${f.size}`} className="flex items-center gap-2.5 px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <FileIcon type={selectedType} className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700" title={f.name}>
                      {f.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">{formatSize(f.size)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center">
                <div className="sm:w-44">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Document type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    {ATTACHMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UploadIcon className="h-3.5 w-3.5" />
                  {uploading ? 'Uploading…' : 'Upload documents'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing documents */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Uploaded documents
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {(data.attachments || []).length}
            </span>
          </div>
          {(data.attachments || []).length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(data.attachments || []).map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold hover:brightness-95 transition ${TYPE_STYLES[att.type] || TYPE_STYLES.Other}`}
                  title={`Open ${att.name}`}
                >
                  <FileIcon type={att.type} className="h-3 w-3" />
                  {att.name}
                  <span className="text-[9px] opacity-70">{att.size}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              No documents uploaded yet. Your uploads will appear here.
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400 leading-relaxed">
          {[data.companyName, data.companyAddress, data.companyPhone, data.companyEmail]
            .filter(Boolean)
            .join(' • ') || '— LEADS'}
        </p>
      </div>
    </div>
  )
}