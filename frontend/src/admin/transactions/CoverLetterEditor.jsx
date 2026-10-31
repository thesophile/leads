import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import Layout from '../../Layout/Layout'
import Spinner from '../../components/Spinner'
import { api } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import { can } from '../../utils/permissions'
import CoverLetterPages, { coverLetterHasContent } from './CoverLetterPages'

// A4 geometry (mirrors the proposal form pages).
const A4_HEIGHT_MM = 297
const PAGE_MARGIN_MM = 10
const MM_TO_PX = 96 / 25.4
// Printable height of one A4 page: the page height minus its top/bottom margins.
const PAGE_CONTENT_PX = (A4_HEIGHT_MM - PAGE_MARGIN_MM * 2) * MM_TO_PX

const COVER_LETTER_TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image', 'box'],
  ['clean'],
]

// Register custom "box" icon in Quill's Snow theme toolbar
const Quill = ReactQuill?.Quill
if (Quill) {
  const icons = Quill.import('ui/icons')
  if (icons && !icons.box) {
    icons.box =
      '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="12" width="14" x="2" y="3" rx="1.5"></rect><line class="ql-stroke" x1="5" x2="13" y1="7" y2="7"></line><line class="ql-stroke" x1="5" x2="11" y1="11" y2="11"></line></svg>'
  }
}

const DATA_URL_RE = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g

// The box marker is Quill's block-scope class format "indent" (class
// "ql-indent-1"), which is added to the block element so the line keeps its
// own type (heading stays a heading, paragraph stays a paragraph).
const BOX_INDENT = 1

function isBoxed(format) {
  if (!format || format.indent == null) return false
  if (Array.isArray(format.indent)) {
    return format.indent.every((v) => Number(v) === BOX_INDENT)
  }
  return Number(format.indent) === BOX_INDENT
}

function BackIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function EyeIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EditIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}


export default function CoverLetterEditor() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { user } = useAuth()
  const letterId = params.id || ''

  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [company, setCompany] = useState({})
  const [loading, setLoading] = useState(() => Boolean(params.id))
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(() => Boolean(location.state?.justSaved))
  const [deleting, setDeleting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [pageCount, setPageCount] = useState(1)
  const [guideTop, setGuideTop] = useState(0)
  const [cursorInBox, setCursorInBox] = useState(false)

  const quillRef = useRef(null)
  const wrapperRef = useRef(null)
  const fileInputRef = useRef(null)
  const savedTimerRef = useRef(null)
  const toolbarDockRef = useRef(null)

  const canEdit = !!user && (can(user, 'quotation.create') || can(user, 'quotation.edit'))

  useEffect(() => {
    if (showPreview) return
    api.get('/auth/company/')
      .then((data) => setCompany(data || {}))
      .catch(() => setCompany({}))
  }, [])

  useEffect(() => {
    if (showPreview) return
    if (!letterId) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get(`/transactions/cover-letters/${encodeURIComponent(letterId)}/`)
        if (cancelled) return
        setName(data?.name || '')
        setContent(data?.content || '')
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [letterId])

  // Measure the edited letter so the page-break guides and the page counter
  // stay in sync with the content while typing.
  const measure = useCallback(() => {
    const quill = quillRef.current?.getEditor?.()
    const root = quill?.root
    const wrapper = wrapperRef.current
    if (!root || !wrapper) return
    const wrapperRect = wrapper.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    setGuideTop(Math.max(0, rootRect.top - wrapperRect.top))
    const height = root.scrollHeight || 0
    setPageCount(Math.max(1, Math.ceil(height / PAGE_CONTENT_PX)))
  }, [])

  useEffect(() => {
    if (showPreview) return
    const quill = quillRef.current?.getEditor?.()
    const root = quill?.root
    if (!root) return
    // The observer delivers an initial measurement on the next frame, so the
    // page guides appear without setting state inside this effect.
    const observer = new ResizeObserver(() => measure())
    observer.observe(root)
    window.addEventListener('resize', measure)
    if (document.fonts?.ready) document.fonts.ready.then(() => measure())
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, showPreview])

  // Quill builds its own toolbar and drops it above the editor. Move that node
  // into the dock on the right so the toolbar can stand vertically beside the
  // page instead of taking room on the printed sheet.
  useEffect(() => {
    if (showPreview) return
    const dock = toolbarDockRef.current
    const quill = quillRef.current?.getEditor?.() || quillRef.current?.editor
    const toolbar = quill?.getModule?.('toolbar')?.container
    if (!dock || !toolbar) return

    if (toolbar.parentElement !== dock) {
      dock.replaceChildren(toolbar)
    } else {
      Array.from(dock.children).forEach((child) => {
        if (child !== toolbar) child.remove()
      })
    }
  })

  useEffect(() => {
    if (showPreview) return
    return () => {
      if (toolbarDockRef.current) {
        toolbarDockRef.current.innerHTML = ''
      }
    }
  }, [])

  useEffect(() => {
    if (showPreview) return
    const handler = (e) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Track whether the cursor sits inside a box, so the Box button can show
  // itself as a toggle.
  const handleSelectionChange = useCallback((range) => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill || !range) {
      setCursorInBox(false)
      return
    }
    setCursorInBox(isBoxed(quill.getFormat(range)))
  }, [])

  // Put the selected lines in a bordered box (or take them out again).
  //
  // The box is marked with Quill's block-scope class format ("indent"), which
  // is added to the block element and therefore keeps the line's own type: a
  // heading stays a heading and a paragraph stays a paragraph, with all the
  // rich text inside untouched. Consecutive marked lines are drawn as one box
  // by the stylesheet (see index.css).
  const toggleBox = useCallback(() => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill) return
    quill.focus()
    const range = quill.getSelection()
    if (!range) return

    // Expand the selection to whole lines, so the marker lands on the block
    // element of every selected line (a partial line would get the marker on
    // its text instead).
    const lines = quill.getLines(range.index, Math.max(range.length, 1))
    if (!lines || lines.length === 0) return
    const first = lines[0]
    const last = lines[lines.length - 1]
    const start = quill.getIndex(first)
    const end = quill.getIndex(last) + last.length()
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      quill.setSelection(start, end - start, 'silent')
    }

    const wasBoxed = isBoxed(quill.getFormat(range))
    // 'user' so the change counts as a real edit (not a load-time update).
    quill.format('indent', wasBoxed ? 0 : BOX_INDENT, 'user')
    setCursorInBox(!wasBoxed)
  }, [])

  useEffect(() => {
    if (showPreview) return
    const btn =
      toolbarDockRef.current?.querySelector('.ql-box') ||
      wrapperRef.current?.querySelector('.ql-box')
    if (btn) {
      btn.setAttribute('title', 'Box / Callout')
      btn.setAttribute('aria-label', 'Box')
      btn.classList.toggle('ql-active', cursorInBox)
    }
  }, [cursorInBox])

  async function uploadFile(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/transactions/cover-letters/images/', form)
    if (!res?.url) throw new Error('The image could not be uploaded.')
    return res.url
  }

  async function uploadDataUrl(dataUrl) {
    const [meta, payload] = String(dataUrl).split(',')
    const mime = (meta.match(/data:(.*?);/) || [])[1] || 'image/png'
    const extension = (mime.split('/')[1] || 'png').split('+')[0]
    const binary = atob(payload || '')
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    const file = new File([bytes], `image.${extension}`, { type: mime })
    return uploadFile(file)
  }

  // Images pasted into the editor are stored inline as data URLs. They are
  // uploaded to the server on save so the letter stays small and the printed
  // pages can load them.
  async function persistInlineImages(html) {
    const matches = String(html || '').match(DATA_URL_RE)
    if (!matches || !matches.length) return html
    const uploaded = new Map()
    for (const dataUrl of Array.from(new Set(matches))) {
      try {
        uploaded.set(dataUrl, await uploadDataUrl(dataUrl))
      } catch {
        // Keep the inline image when the upload fails.
      }
    }
    let result = String(html || '')
    for (const [from, to] of uploaded.entries()) {
      result = result.split(from).join(to)
    }
    return result
  }

  const handlePickImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  async function handleImageSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setUploadingImage(true)
    try {
      const url = await uploadFile(file)
      const quill = quillRef.current?.getEditor?.()
      if (!quill) return
      const range = quill.getSelection(true)
      const index = range ? range.index : quill.getLength() - 1
      quill.insertEmbed(index, 'image', url, 'user')
      quill.setSelection(index + 1, 0, 'silent')
      quill.focus()
    } catch (err) {
      setError(err.message || 'The image could not be uploaded.')
    } finally {
      setUploadingImage(false)
    }
  }

  const modules = useMemo(
    () => ({
      toolbar: {
        container: COVER_LETTER_TOOLBAR,
        handlers: {
          image: handlePickImage,
          box: toggleBox,
        },
      },
    }),
    [handlePickImage, toggleBox]
  )

  useEffect(() => {
    if (showPreview) return
    if (location.state?.justSaved) {
      window.history.replaceState({}, document.title)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
    }
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [location.state])

  async function handleSave(opts = {}) {
    const andLeave = opts?.andLeave === true
    setError('')
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please give the cover letter a name before saving.')
      return false
    }
    setSaving(true)
    try {
      const body = { name: trimmedName, content: await persistInlineImages(content) }
      if (letterId) {
        const savedData = await api.put(
          `/transactions/cover-letters/${encodeURIComponent(letterId)}/`,
          body
        )
        setName(savedData?.name || trimmedName)
        setContent(savedData?.content || body.content)
      } else {
        const savedData = await api.post('/transactions/cover-letters/', body)
        if (andLeave) {
          setDirty(false)
          navigate('/settings')
          return true
        }
        if (savedData?.id) {
          navigate(`/cover-letters/${savedData.id}`, { replace: true, state: { justSaved: true } })
          return true
        }
        setName(savedData?.name || trimmedName)
        setContent(savedData?.content || body.content)
      }
      setDirty(false)
      setSaved(true)
      if (andLeave) {
        navigate('/settings')
        return true
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
      return true
    } catch (err) {
      setError(err.message || 'The cover letter could not be saved.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRef = useRef(handleSave)
  useEffect(() => {
    if (showPreview) return
    handleSaveRef.current = handleSave
  })

  useEffect(() => {
    if (showPreview) return
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 's' || e.code === 'KeyS')) {
        e.preventDefault()
        if (!saving && canEdit) {
          handleSaveRef.current?.()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saving, canEdit])

  async function handleDelete() {
    if (!letterId) return
    setDeleting(true)
    setError('')
    try {
      await api.del(`/transactions/cover-letters/${encodeURIComponent(letterId)}/`)
      setDirty(false)
      setConfirmDelete(false)
      navigate('/settings')
    } catch (err) {
      setError(err.message || 'The cover letter could not be deleted.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  function handleBack() {
    if (dirty) {
      setConfirmLeave(true)
      return
    }
    navigate('/settings')
  }

  const guides = []
  for (let i = 1; i < pageCount; i += 1) {
    guides.push({ top: guideTop + i * PAGE_CONTENT_PX, page: i + 1 })
  }

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        {/* Toolbar */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
          >
            <BackIcon className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="min-w-[200px] flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cover Letter Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setDirty(true)
              }}
              placeholder="e.g. Standard Proposal Cover Letter"
              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <span className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
            Pages: {pageCount}
          </span>

          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition cursor-pointer ${
              showPreview
                ? 'border-brand-500 bg-brand-50 text-brand-600'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showPreview ? <EditIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
            {showPreview ? 'Edit' : 'Preview'}
          </button>

          {letterId ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 cursor-pointer disabled:opacity-60"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canEdit}
            className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              saved
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {saving ? <Spinner className="h-3.5 w-3.5" /> : saved ? <CheckIcon className="h-3.5 w-3.5" /> : null}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save Cover Letter'}
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
            {error}
          </div>
        ) : null}
        {!canEdit ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700">
            You do not have permission to create or edit cover letters.
          </div>
        ) : null}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8 text-brand-600" />
          </div>
        ) : notFound ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-xs text-slate-500 shadow-xs">
            This cover letter could not be found.
          </div>
        ) : (
          <div className="w-full">
            {/* Editor canvas */}
            <div className={`flex min-w-0 flex-1 items-start gap-3 ${showPreview ? 'hidden' : ''}`}>
              <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl bg-slate-200/60 p-4 sm:p-8">
                <div
                  className="relative mx-auto w-[210mm] bg-white px-[10mm] pt-[10mm] pb-[10mm] shadow-2xl border border-slate-300 rounded-sm"
                  style={{ boxSizing: 'border-box' }}
                >
                  <div ref={wrapperRef} className="relative">
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      className="cover-letter-editor"
                      value={content}
                      onChange={(value, delta, source) => {
                        setContent(value)
                        // Programmatic updates (loading / saving the letter) must
                        // not mark the letter as edited.
                        if (source !== 'api') setDirty(true)
                      }}
                      modules={modules}
                      onChangeSelection={handleSelectionChange}
                      readOnly={!canEdit}
                      placeholder="Type your cover letter here — headings, bold text, lists and images are all supported."
                    />
                    {/* Page-break guides */}
                    <div className="pointer-events-none absolute inset-0">
                      {guides.map((guide) => (
                        <div
                          key={guide.page}
                          className="absolute left-0 right-0 border-t-2 border-dashed border-rose-300"
                          style={{ top: guide.top }}
                        >
                          <span className="absolute -top-4 left-0 rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400">
                            Page {guide.page}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {uploadingImage ? (
                    <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-500">
                      <Spinner className="h-3.5 w-3.5" />
                      Uploading image…
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Vertical formatting toolbar. Quill's toolbar is moved here. */}
              <div ref={toolbarDockRef} className="cover-letter-toolbar-dock print-hidden" />
            </div>

            {/* Printed page preview */}
            {showPreview ? (
              <div className="overflow-x-auto rounded-2xl bg-slate-200/60 p-4 sm:p-8">
                {coverLetterHasContent(content) ? (
                  <CoverLetterPages html={content} company={company} />
                ) : (
                  <div className="mx-auto flex h-[297mm] w-full max-w-[210mm] items-center justify-center rounded-sm border border-slate-300 bg-white p-[10mm] shadow-2xl">
                    <p className="text-xs font-semibold text-slate-400">The cover letter has no content yet.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleImageSelected}
      />

      {confirmDelete ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="absolute inset-0" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">
              Delete this cover letter?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Proposals that already use this letter keep their printed pages, but the letter will no longer be available for new proposals.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-rose-700 cursor-pointer disabled:opacity-60"
              >
                {deleting ? <Spinner className="h-3.5 w-3.5" /> : <TrashIcon className="h-3.5 w-3.5" />}
                {deleting ? 'Deleting…' : 'Delete Cover Letter'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmLeave ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="absolute inset-0" onClick={() => !saving && setConfirmLeave(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">
              Leave without saving?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              You have unsaved changes. Are you sure you want to discard them and leave?
            </p>
            {error ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmLeave(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer disabled:opacity-60"
              >
                Keep Editing
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setDirty(false)
                  setConfirmLeave(false)
                  navigate('/settings')
                }}
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 cursor-pointer disabled:opacity-60"
              >
                Discard & Leave
              </button>
              {canEdit ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const ok = await handleSave({ andLeave: true })
                    if (ok) {
                      setConfirmLeave(false)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-brand-700 cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Spinner className="h-3.5 w-3.5" /> : null}
                  {saving ? 'Saving…' : 'Save & Leave'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  )
}
