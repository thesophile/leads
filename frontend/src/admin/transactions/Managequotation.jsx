import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import Layout from '../../Layout/Layout'
import { api } from '../../api/client'
import { can } from '../../utils/permissions'
import { useAuth } from '../../context/auth-context'
import { PROPOSAL_TEMPLATES } from './proposalTemplates'
import ConfirmDialog from '../../components/ConfirmDialog'
import useDirty from '../../utils/useDirty'

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ header: [2, 3, 4, false] }],
    ['link', 'blockquote'],
    ['clean'],
  ],
}

const QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'link',
  'blockquote',
]

const SCOPE_MAX_CHARS = 1000

const stripHtmlText = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const clampRichHtml = (html, limit) => {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_ALL)
  const nodes = []
  let node
  while ((node = walker.nextNode())) nodes.push(node)
  let count = 0
  let cutIdx = -1
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.nodeType === 3) {
      const len = n.textContent.length
      if (count + len > limit) {
        n.textContent = n.textContent.slice(0, Math.max(0, limit - count))
        cutIdx = i
        break
      }
      count += len
    }
  }
  if (cutIdx >= 0) {
    for (let i = cutIdx + 1; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.parentNode) n.parentNode.removeChild(n)
    }
  }
  return div.innerHTML
}

function parseMoney(value) {
  const s = String(value == null ? '' : value).replace(/[, ]/g, '').trim()
  if (!s) return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function fmtMoney(n) {
  const rounded = Math.round(n * 100) / 100
  return rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function netFrom(total, discount) {
  return fmtMoney(parseMoney(total) - parseMoney(discount))
}

function normalizeRichText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function mapLeadToQuotation(lead) {
  const q = lead.quotation
  return {
    id: lead.id,
    leadId: lead.id,
    customer: q?.customer || lead.contact || '',
    company: q?.company || lead.company || '',
    mobile: q?.mobile || lead.phone || '',
    email: q?.email || lead.email || '',
    category: q?.category || lead.category || '',
    city: q?.city || lead.city || '',
    bdm: q?.bdm || lead.assignedTo || '',
    qtnBy: q?.qtnBy || lead.addedBy || '',
    staff: q?.staff || lead.assignedTo || lead.addedBy || '',
    date: q?.date || lead.displayDate || lead.date || '',
    revisionNo: q?.revisionNo || '',
    status: q ? q.status || 'Not Sent' : 'Quotation Requested',
    total: q?.total || '',
    discount: q?.discount || '',
    netAmount: q?.netAmount || '',
    currency: q?.currency || 'INR (₹)',
    source: q?.source || lead.source || '',
    proposalScope: q?.proposalScope || '',
    termsConditions: q?.termsConditions || '',
    companyTerms: q?.companyTerms || '',
    hasProposal: !!q,
    approverName: q?.approverName || '',
    submittedBy: q?.submittedBy || null,
    submittedByName: q?.submittedByName || '',
    signedBy: q?.signedBy || '',
    signatureRef: q?.signatureRef || '',
    approvedAt: q?.approvedAt || '',
    rejectedAt: q?.rejectedAt || '',
    rejectionReason: q?.rejectionReason || '',
    approvals: q?.approvals || [],
    approvalsTotal: q?.approvalsTotal || 0,
    approvalsApproved: q?.approvalsApproved || 0,
    remarks: q?.remarks || lead.remarks || '',
  }
}

const STAFF_LIST = [
  'All Staff',
  'NIMISHA DAVIS',
  'Priya Sharma',
  'Alex Joseph',
  'Ananya Nair',
  'Shanu VR',
]

const STATUS_LIST = [
  'All Status',
  'Quotation Requested',
  'Not Sent',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Sent to Client',
]

const SOURCES = [
  'Google Search',
  'Official Website',
  'Instagram Campaign',
  'Facebook Ads',
  'Customer Referral',
  'Direct Walk-in',
  'Telecalling Outreach',
]

const CURRENCIES = [
  'INR (₹)',
  'USD ($)',
  'AED (د.إ)',
  'EUR (€)',
  'SAR (﷼)',
]

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function PhoneCallIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function FileTextIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function UndoIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  )
}

function EyeIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PencilIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function MoreVerticalIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

function SendIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

export default function Managequotation() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canFilterByStaff = !!user && (can(user, 'leads.view_all') || user.is_superuser)
  const [quotationsList, setQuotationsList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('All Staff')
  const [staffOptions, setStaffOptions] = useState(STAFF_LIST)
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [searchQuery, setSearchQuery] = useState('')
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [menuOffset, setMenuOffset] = useState(null)
  const [activeMenuQuote, setActiveMenuQuote] = useState(null)
  const menuRef = useRef(null)
  const newProposalCounter = useRef(1)
  const leadIdSeqRef = useRef(0)
  const draftKeyRef = useRef('')
  const proposalModalOpenRef = useRef(false)
  const cardRef = useRef(null)
  const templateDropdownRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const data = await api.get('/transactions/leads/?status=quotation')
        if (!cancelled) setQuotationsList(data.map(mapLeadToQuotation))
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchStaffOptions() {
      try {
        const data = await api.get('/auth/assignable-staff/')
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setStaffOptions(['All Staff', ...data.map((s) => s.name)])
        }
      } catch {
        // Fall back to the static STAFF_LIST if the endpoint is unavailable.
      }
    }

    if (canFilterByStaff) fetchStaffOptions()
    return () => {
      cancelled = true
    }
  }, [canFilterByStaff])

  // Real approving users for the "Send for Approval" picker.
  const [approverOptions, setApproverOptions] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get('/transactions/quotations/approvers/')
        if (!cancelled && Array.isArray(data)) setApproverOptions(data)
      } catch {
        // Leave the approver picker empty if the endpoint is unavailable.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function handleToggleMenu(e, id, row) {
    const cardRect = cardRef.current ? cardRef.current.getBoundingClientRect() : { left: 0, top: 0 }
    setMenuOffset({ x: e.clientX - cardRect.left, y: e.clientY - cardRect.top })
    setActiveMenuQuote(row)
    setOpenDropdownId((prev) => (prev === id ? null : id))
  }

  useLayoutEffect(() => {
    if (!openDropdownId || !menuOffset || !menuRef.current) return
    const w = menuRef.current.offsetWidth
    const h = menuRef.current.offsetHeight
    const pad = 8
    let left = menuOffset.x
    let top = menuOffset.y + 12
    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect()
      if (cardRect.left + left + w > window.innerWidth - pad) {
        left = window.innerWidth - pad - cardRect.left - w
      }
      if (cardRect.top + top + h > window.innerHeight - pad) {
        top = menuOffset.y - h - 12
      }
    }
    menuRef.current.style.left = `${left}px`
    menuRef.current.style.top = `${top}px`
  }, [openDropdownId, menuOffset])

  // "Send for Approval" Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [approvalQuoteId, setApprovalQuoteId] = useState(null)
  const [selectedApprovers, setSelectedApprovers] = useState([])
  const [approvalSent, setApprovalSent] = useState('')

  function toggleApprover(id) {
    setSelectedApprovers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleViewProposal(quote) {
    navigate(`/quotations/preview/${quote.id}`, { state: { proposal: quote } })
  }

  function handleOpenApprovalModal(quoteId, e) {
    e.stopPropagation()
    setApprovalQuoteId(quoteId)
    setSelectedApprovers([])
    setApprovalSent('')
    setOpenDropdownId(null)
    setApprovalModalOpen(true)
  }

  async function handleConfirmSendForApproval() {
    if (selectedApprovers.length === 0) return
    const quote = quotationsList.find((item) => item.id === approvalQuoteId)
    const chosen = approverOptions.filter((a) => selectedApprovers.includes(a.id))
    const approverNames = chosen.map((a) => a.name).join(', ')
    setQuotationsList((prev) =>
      prev.map((item) =>
        item.id === approvalQuoteId
          ? {
              ...item,
              status: 'Pending Approval',
              approverName: approverNames,
              approvalsTotal: selectedApprovers.length,
              remarks: `Sent to ${approverNames} for approval`,
            }
          : item
      )
    )
    setApprovalSent(`✓ Proposal sent to ${approverNames} for approval`)
    resetApprovalDirty()
    if (quote?.leadId) {
      let updated = null
      try {
        updated = await api.put(`/transactions/quotations/${quote.leadId}/`, {
          status: 'Pending Approval',
          approvers: selectedApprovers,
          remarks: `Sent to ${approverNames} for approval`,
        })
      } catch (err) {
        console.error('Failed to persist approval status', err)
      }
      if (updated) {
        setQuotationsList((prev) =>
          prev.map((item) =>
            item.id === approvalQuoteId
              ? {
                  ...item,
                  approvals: updated.approvals || [],
                  approvalsTotal: updated.approvalsTotal ?? item.approvalsTotal,
                  approvalsApproved: updated.approvalsApproved ?? 0,
                }
              : item
          )
        )
      }
    }
    setTimeout(() => {
      setApprovalModalOpen(false)
      setApprovalSent('')
    }, 1100)
  }

  // "New Proposal" Modal State (matching user's reference screenshot)
  const [proposalModalOpen, setProposalModalOpen] = useState(false)
  const [editingProposalId, setEditingProposalId] = useState(null)
  
  const [bdm, setBdm] = useState('Alex Joseph')
  const [qtnBy, setQtnBy] = useState('Priya Sharma')
  const [revisionNo, setRevisionNo] = useState('')
  const [customerPerson, setCustomerPerson] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [mobileNum, setMobileNum] = useState('')
  const [categoryName, setCategoryName] = useState('Hospital')
  
  const [scopeHtml, setScopeHtml] = useState('')
  const [termsHtml, setTermsHtml] = useState('')
  
  const [totalVal, setTotalVal] = useState('')
  const [discountVal, setDiscountVal] = useState('10,000')
  const [sourceVal, setSourceVal] = useState('Google Search')
  const [currencyVal, setCurrencyVal] = useState('INR (₹)')
  const [remarksVal, setRemarksVal] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  function clearError(field) {
    setValidationErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const [submitMessage, setSubmitMessage] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [discardProposalOpen, setDiscardProposalOpen] = useState(false)
  const [discardApprovalOpen, setDiscardApprovalOpen] = useState(false)

  const [savedTemplates, setSavedTemplates] = useState([])
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateOverrideOpen, setTemplateOverrideOpen] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState(null)
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState(null)
  const [draftKey, setDraftKey] = useState('')
  const [proposalLoading, setProposalLoading] = useState(false)

  useEffect(() => {
    if (!templateDropdownOpen) return
    function handleOutsideClick(e) {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target)) {
        setTemplateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [templateDropdownOpen])

  // Load user's saved templates once on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.get('/transactions/proposal-templates/')
        if (!cancelled) {
          const myTemplates = (data || []).filter((t) => t.owner)
          setSavedTemplates(myTemplates)
        }
      } catch (err) {
        console.error('Failed to load proposal templates', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const { dirty: proposalDirty, reset: resetProposalDirty } = useDirty(
    proposalModalOpen,
    useMemo(
      () => ({
        bdm,
        qtnBy,
        revisionNo,
        customerPerson,
        companyName,
        mobileNum,
        categoryName,
        scopeHtml: normalizeRichText(scopeHtml),
        termsHtml: normalizeRichText(termsHtml),
        totalVal,
        discountVal,
        sourceVal,
        currencyVal,
        remarksVal,
      }),
      [
        bdm, qtnBy, revisionNo, customerPerson, companyName, mobileNum, categoryName,
        scopeHtml, termsHtml, totalVal, discountVal, sourceVal, currencyVal, remarksVal,
      ]
    )
  )

  const { dirty: approvalDirty, reset: resetApprovalDirty } = useDirty(
    approvalModalOpen,
    useMemo(() => ({ selectedApprovers }), [selectedApprovers])
  )

  useEffect(() => {
    proposalModalOpenRef.current = proposalModalOpen
    if (!proposalModalOpen) return
    resetProposalDirty()
    const settle = setTimeout(() => {
      resetProposalDirty()
    }, 150)
    return () => clearTimeout(settle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalModalOpen])

  useEffect(() => {
    if (proposalModalOpen && !proposalLoading) {
      const settle = setTimeout(() => {
        resetProposalDirty()
      }, 50)
      return () => clearTimeout(settle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalModalOpen, proposalLoading])

  useEffect(() => {
    document.body.style.overflow = proposalModalOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [proposalModalOpen])

  function requestCloseProposal() {
    if (proposalDirty) setDiscardProposalOpen(true)
    else setProposalModalOpen(false)
  }

  function requestCloseApproval() {
    if (approvalDirty) setDiscardApprovalOpen(true)
    else setApprovalModalOpen(false)
  }

  function resolveTemplate(templateId) {
    if (!templateId) return null
    if (String(templateId).startsWith('saved-')) {
      const key = templateId.replace('saved-', '')
      return savedTemplates.find((t) => String(t.id) === key) || null
    }
    return PROPOSAL_TEMPLATES.find((t) => t.id === templateId) || null
  }

  const activeTemplate = resolveTemplate(selectedTemplateId)
  const editingSavedTemplate = Boolean(
    selectedTemplateId && String(selectedTemplateId).startsWith('saved-')
  )
  const usingPrebuiltTemplate = Boolean(selectedTemplateId && !editingSavedTemplate)

  function templateNameTaken(name) {
    const n = name.trim().toLowerCase()
    return (
      PROPOSAL_TEMPLATES.some((t) => t.name.toLowerCase() === n) ||
      savedTemplates.some((t) => t.name.toLowerCase() === n)
    )
  }

  function suggestTemplateName(baseName) {
    if (!baseName) return ''
    let candidate = `${baseName} - Copy`
    let i = 2
    while (templateNameTaken(candidate)) {
      candidate = `${baseName} - Copy ${i}`
      i += 1
    }
    return candidate
  }

  function hasFormContent() {
    return Boolean(
      (scopeHtml && scopeHtml.replace(/<[^>]*>/g, '').trim()) ||
        (termsHtml && termsHtml.replace(/<[^>]*>/g, '').trim()) ||
        customerPerson.trim() ||
        companyName.trim() ||
        mobileNum.trim() ||
        totalVal.trim()
    )
  }

  function applyTemplate(templateId) {
    setSelectedTemplateId(templateId)
    const tpl = resolveTemplate(templateId)
    if (tpl) {
      setScopeHtml(tpl.scopeHtml || tpl.scope_html || '')
      setTermsHtml(tpl.detailHtml || tpl.detail_html || '')
      setCategoryName(tpl.category || 'General')
      setTotalVal(tpl.defaultTotal || tpl.default_total || '')
      setDiscountVal(tpl.defaultDiscount || tpl.default_discount || '')
      setCurrencyVal(tpl.currency || 'INR (₹)')
    } else {
      setScopeHtml('')
      setTermsHtml('')
      setCategoryName('General')
      setTotalVal('')
      setDiscountVal('0')
      setCurrencyVal('INR (₹)')
    }
  }

  function handleSelectTemplate(templateId) {
    if (hasFormContent()) {
      setPendingTemplateId(templateId)
      setTemplateOverrideOpen(true)
      return
    }
    applyTemplate(templateId)
  }

  function confirmTemplateOverride() {
    setTemplateOverrideOpen(false)
    applyTemplate(pendingTemplateId)
    setPendingTemplateId(null)
  }

  function cancelTemplateOverride() {
    setTemplateOverrideOpen(false)
    setPendingTemplateId(null)
  }

  async function handleDeleteTemplate() {
    const tpl = templateToDelete
    if (!tpl) return
    try {
      await api.del(`/transactions/proposal-templates/${tpl.id}/`)
      setSavedTemplates((prev) => prev.filter((t) => String(t.id) !== String(tpl.id)))
      if (selectedTemplateId === `saved-${tpl.id}`) setSelectedTemplateId('')
      showToast(`✓ Template "${tpl.name}" deleted.`)
    } catch (err) {
      showToast(`Failed to delete template: ${err.message}`)
    } finally {
      setTemplateToDelete(null)
    }
  }

  // Filtered dataset
  const filteredQuotations = useMemo(() => {
    return quotationsList.filter((item) => {
      const matchesStaff =
        selectedStaff === 'All Staff' || item.staff === selectedStaff || item.bdm === selectedStaff

      const matchesStatus =
        selectedStatus === 'All Status' || item.status === selectedStatus

      const matchesSearch =
        item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mobile.includes(searchQuery) ||
        item.staff.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesStaff && matchesStatus && matchesSearch
    })
  }, [quotationsList, selectedStaff, selectedStatus, searchQuery])

  // Status Metrics
  const notSentCount = useMemo(
    () => quotationsList.filter((q) => q.status === 'Not Sent').length,
    [quotationsList]
  )
  const quotationRequestedCount = useMemo(
    () => quotationsList.filter((q) => q.status === 'Quotation Requested').length,
    [quotationsList]
  )
  const pendingApprovalCount = useMemo(
    () => quotationsList.filter((q) => q.status === 'Pending Approval').length,
    [quotationsList]
  )
  const approvedCount = useMemo(
    () => quotationsList.filter((q) => q.status === 'Approved').length,
    [quotationsList]
  )
  const rejectedCount = useMemo(
    () => quotationsList.filter((q) => q.status === 'Rejected').length,
    [quotationsList]
  )

  // Open "New Proposal" Modal
  function applyDraftToForm(draft) {
    if (!draft || typeof draft !== 'object') return
    if (draft.bdm) setBdm(draft.bdm)
    if (draft.qtnBy) setQtnBy(draft.qtnBy)
    if (draft.revisionNo !== undefined) setRevisionNo(draft.revisionNo)
    if (draft.customerPerson !== undefined) setCustomerPerson(draft.customerPerson)
    if (draft.companyName !== undefined) setCompanyName(draft.companyName)
    if (draft.mobile !== undefined) setMobileNum(draft.mobile)
    if (draft.category) setCategoryName(draft.category)
    if (draft.scopeHtml !== undefined) setScopeHtml(draft.scopeHtml)
    if (draft.termsHtml !== undefined) setTermsHtml(draft.termsHtml)
    if (draft.total !== undefined) setTotalVal(draft.total)
    if (draft.discount !== undefined) setDiscountVal(draft.discount)
    if (draft.source) setSourceVal(draft.source)
    if (draft.currency) setCurrencyVal(draft.currency)
    if (draft.remarks !== undefined) setRemarksVal(draft.remarks)
  }

  async function handleOpenNewProposalModal(quote = null) {
    setValidationErrors({})
    setSelectedTemplateId('')
    const nextDraftKey = quote ? String(quote.id) : `new-${newProposalCounter.current}`
    newProposalCounter.current += 1
    setDraftKey(nextDraftKey)
    draftKeyRef.current = nextDraftKey
    if (quote) {
      setEditingProposalId(quote.id)
      setBdm(quote.bdm || quote.staff || 'Alex Joseph')
      setQtnBy(quote.qtnBy || quote.staff || 'Priya Sharma')
      setRevisionNo(quote.revisionNo || `${quote.id} (Rev 1)`)
      setCustomerPerson(quote.customer || '')
      setCompanyName(quote.company || '')
      setMobileNum(quote.mobile || '')
      setCategoryName(quote.category || 'Hospital')
      setScopeHtml(quote.proposalScope || '')
      setTermsHtml(quote.termsConditions || '')
      setTotalVal(quote.total || quote.amount?.replace('₹', '') || '')
      setDiscountVal(quote.discount || '0')
      setSourceVal(quote.source || 'Google Search')
      setCurrencyVal(quote.currency || 'INR (₹)')
      setRemarksVal(quote.hasProposal ? (quote.notes || quote.remarks || '') : '')
    } else {
      // Clean new proposal
      setEditingProposalId(null)
      setBdm('Alex Joseph')
      setQtnBy('Priya Sharma')
      setRevisionNo(`QT-2026-${String(quotationsList.length + 1).padStart(3, '0')} (Rev 1)`)
      setCustomerPerson('')
      setCompanyName('')
      setMobileNum('')
      setCategoryName('General')
      setScopeHtml('')
      setTermsHtml('')
      setTotalVal('')
      setDiscountVal('0')
      setSourceVal('Google Search')
      setCurrencyVal('INR (₹)')
      setRemarksVal('')
    }
    setProposalModalOpen(true)
    setProposalLoading(true)
    try {
      const draft = await api.get(`/transactions/proposal-drafts/?proposal_id=${encodeURIComponent(nextDraftKey)}`)
      if (draft && Object.keys(draft).length && draftKeyRef.current === nextDraftKey && proposalModalOpenRef.current) {
        applyDraftToForm(draft)
      }
    } catch (err) {
      console.error('Failed to load proposal draft', err)
    } finally {
      if (draftKeyRef.current === nextDraftKey) setProposalLoading(false)
    }
  }

  function validateProposalForm() {
    const errors = {}
    const stripHtml = (html) => (html ? String(html).replace(/<[^>]*>/g, '').trim() : '')
    const rules = [
      { key: 'customerPerson', label: 'Client Name', value: customerPerson.trim() },
      { key: 'scopeHtml', label: 'Scope & Deliverables', value: stripHtml(scopeHtml) },
      { key: 'termsHtml', label: 'Proposal in Detail', value: stripHtml(termsHtml) },
      { key: 'totalVal', label: 'Total', value: totalVal.trim() },
    ]
    rules.forEach(({ key, label, value }) => {
      if (!value) errors[key] = `${label} is required`
    })
    if (stripHtmlText(scopeHtml).length > SCOPE_MAX_CHARS) {
      errors.scopeHtml = `Scope & Deliverables must be ${SCOPE_MAX_CHARS.toLocaleString()} characters or fewer`
    }
    return errors
  }

  // Handle Proposal Submission for Approval
  async function handleSubmitProposal(e) {
    e.preventDefault()

    const errors = validateProposalForm()
    setValidationErrors(errors)
    if (stripHtmlText(scopeHtml).length > SCOPE_MAX_CHARS) {
      showToast(
        `Character limit exceeded — Scope & Deliverables must be ${SCOPE_MAX_CHARS.toLocaleString()} characters or fewer.`,
        'error',
      )
      return
    }
    if (Object.keys(errors).length > 0) {
      setSubmitMessage('Please fill in the required fields highlighted below.')
      return
    }

    const currentScope = scopeHtml
    const currentTerms = termsHtml
    let nextApprovalId = null
    let targetQuote = null
    let persistLeadId = null

    if (editingProposalId) {
      // Update existing
      nextApprovalId = editingProposalId
      persistLeadId = editingProposalId
      const existing =
        quotationsList.find((item) => item.id === editingProposalId) || {}
      targetQuote = {
        ...existing,
        bdm,
        qtnBy,
        revisionNo,
        customer: customerPerson || existing.customer,
        company: companyName || existing.company,
        mobile: mobileNum || existing.mobile,
        total: totalVal,
        discount: discountVal,
        netAmount: netFrom(totalVal, discountVal),
        currency: currencyVal,
        source: sourceVal,
        proposalScope: currentScope,
        termsConditions: currentTerms,
        hasProposal: true,
        status: existing.status === 'Quotation Requested' ? 'Not Sent' : existing.status,
        remarks: remarksVal,
      }
      setQuotationsList((prev) =>
        prev.map((item) => (item.id === editingProposalId ? targetQuote : item))
      )
      setSubmitMessage('✓ Proposal details saved. Now choose an admin to send for approval.')
    } else {
      // Create new
      nextApprovalId = `QT-2026-${String(quotationsList.length + 1).padStart(3, '0')}`
      const newProposal = {
        id: nextApprovalId,
        leadId: `LEAD-${String(leadIdSeqRef.current++).padStart(4, '0')}`,
        customer: customerPerson,
        company: companyName,
        mobile: mobileNum,
        email: '',
        category: categoryName,
        city: 'Kerala',
        bdm,
        qtnBy,
        staff: qtnBy,
        date: 'Today',
        revisionNo,
        status: 'Not Sent',
        total: totalVal,
        discount: discountVal,
        netAmount: netFrom(totalVal, discountVal),
        currency: currencyVal,
        source: sourceVal,
        proposalScope: currentScope,
        termsConditions: currentTerms,
        hasProposal: true,
        remarks: remarksVal,
      }
      targetQuote = newProposal
      setQuotationsList([newProposal, ...quotationsList])
      setSubmitMessage('✓ New Proposal created. Now choose an admin to send for approval.')
    }

    if (persistLeadId) {
      try {
        await api.put(`/transactions/quotations/${persistLeadId}/`, {
          customer: targetQuote.customer,
          company: targetQuote.company,
          mobile: targetQuote.mobile,
          email: targetQuote.email,
          category: targetQuote.category,
          city: targetQuote.city,
          bdm: targetQuote.bdm,
          qtnBy: targetQuote.qtnBy,
          staff: targetQuote.staff,
          date: targetQuote.date,
          revisionNo: targetQuote.revisionNo,
          status: targetQuote.status,
          total: targetQuote.total,
          discount: targetQuote.discount,
          netAmount: targetQuote.netAmount,
          currency: targetQuote.currency,
          source: targetQuote.source,
          proposalScope: targetQuote.proposalScope,
          termsConditions: targetQuote.termsConditions,
          remarks: targetQuote.remarks,
        })
      } catch (err) {
        setSubmitMessage(`Failed to save proposal: ${err.message}`)
        return
      }
    }

    resetProposalDirty()
    setTimeout(() => {
      setSubmitMessage('')
      setProposalModalOpen(false)
      setApprovalQuoteId(nextApprovalId)
      setSelectedApprovers([])
      setApprovalSent('')
      setApprovalModalOpen(true)
    }, 900)
  }

  function showToast(msg, type = 'success') {
    setToastType(type)
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2500)
  }

  async function saveDraft() {
    const payload = {
      proposalId: draftKey,
      bdm,
      qtnBy,
      revisionNo,
      customerPerson,
      companyName,
      mobile: mobileNum,
      category: categoryName,
      scopeHtml,
      termsHtml,
      total: totalVal,
      discount: discountVal,
      source: sourceVal,
      currency: currencyVal,
      remarks: remarksVal,
    }
    try {
      await api.put('/transactions/proposal-drafts/', payload)
      showToast('✓ Draft saved.')
      return true
    } catch (err) {
      setSubmitMessage(`Failed to save draft: ${err.message}`)
      return false
    }
  }

  async function handleSaveDraft() {
    const ok = await saveDraft()
    if (ok) resetProposalDirty()
  }

  async function handleSaveDraftAndClose() {
    const ok = await saveDraft()
    if (!ok) return
    setDiscardProposalOpen(false)
    setProposalModalOpen(false)
    resetProposalDirty()
  }

  function openSaveTemplateDialog() {
    setTemplateName(usingPrebuiltTemplate ? suggestTemplateName(activeTemplate?.name || '') : '')
    setSaveTemplateOpen(true)
  }

  async function handleUpdateTemplate() {
    const tpl = activeTemplate
    if (!editingSavedTemplate || !tpl) return
    const id = String(selectedTemplateId).replace('saved-', '')
    const payload = {
      category: categoryName,
      defaultTotal: totalVal,
      defaultDiscount: discountVal,
      currency: currencyVal,
      scopeHtml,
      detailHtml: termsHtml,
    }
    try {
      const data = await api.put(`/transactions/proposal-templates/${id}/`, payload)
      setSavedTemplates((prev) => prev.map((t) => (String(t.id) === id ? data : t)))
      showToast(`✓ Template "${data.name || tpl.name}" updated.`)
    } catch (err) {
      showToast(`Failed to update template: ${err.message}`)
    }
  }

  async function handleSaveTemplate() {
    const name = templateName.trim()
    if (!name) {
      showToast('Please enter a name for the template.')
      return
    }
    if (templateNameTaken(name)) {
      showToast('A template with this name already exists. Please choose another name.')
      return
    }
    const payload = {
      name,
      category: categoryName,
      defaultTotal: totalVal,
      defaultDiscount: discountVal,
      currency: currencyVal,
      scopeHtml,
      detailHtml: termsHtml,
    }
    try {
      const data = await api.post('/transactions/proposal-templates/', payload)
      setSavedTemplates((prev) => [...prev, data])
      setSaveTemplateOpen(false)
      setTemplateName('')
      showToast('✓ Template saved. It is now available in the Choose template dropdown.')
    } catch (err) {
      showToast(`Failed to save template: ${err.message}`)
    }
  }

  // Quick Action: Revert quotation back to Telecalling
  const [revertQuote, setRevertQuote] = useState(null)

  function handleRequestRevertQuotation(quote, e) {
    e.stopPropagation()
    setRevertQuote(quote)
  }

  async function handleConfirmRevertQuotation() {
    if (!revertQuote) return
    const quote = revertQuote
    try {
      if (quote.leadId) await api.del(`/transactions/quotations/${quote.leadId}/`)
      setQuotationsList((prev) => prev.filter((item) => item.id !== quote.id))
    } catch (err) {
      window.alert(`Failed to revert quotation: ${err.message}`)
    } finally {
      setRevertQuote(null)
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        {toastMessage && (
          <div
            className={`fixed top-4 right-4 z-[90] flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg ${
              toastType === 'error'
                ? 'border-rose-200 bg-rose-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                toastType === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {toastType === 'error' ? (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span
              className={`text-xs font-semibold ${
                toastType === 'error' ? 'text-rose-700' : 'text-slate-800'
              }`}
            >
              {toastMessage}
            </span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Manage Quotation & Proposals
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
              Prepare custom commercial proposals, submit for approval, and track client quotations.
            </p>
          </div>

          {/* Action Buttons & Status Metrics */}
          <div className="flex flex-wrap items-center gap-2.5">

            {/* Quick Metrics */}
            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-1.5">
              <div className="rounded-xl border border-purple-200/80 bg-purple-50/60 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 whitespace-nowrap">Requested</span>
                <span className="text-xs font-bold text-purple-700 ml-1">
                  {quotationRequestedCount}
                </span>
              </div>
              <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/60 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 whitespace-nowrap">Not Sent</span>
                <span className="text-xs font-bold text-cyan-700 ml-1">
                  {notSentCount}
                </span>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 whitespace-nowrap">Approval</span>
                <span className="text-xs font-bold text-amber-700 ml-1">
                  {pendingApprovalCount}
                </span>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 whitespace-nowrap">Approved</span>
                <span className="text-xs font-bold text-emerald-700 ml-1">
                  {approvedCount}
                </span>
              </div>
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 px-2.5 py-1.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 whitespace-nowrap">Rejected</span>
                <span className="text-xs font-bold text-rose-700 ml-1">
                  {rejectedCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div ref={cardRef} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Table Toolbar (Staff Filter + Status Filter + Search) */}
          <div className="flex flex-col gap-3.5 border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Staff Filter */}
                {canFilterByStaff && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Staff:
                    </span>
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    >
                      {staffOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Status:
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Search Box */}
              <div className="flex items-center">
                <div className="relative w-full sm:w-60">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search customer, company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-l-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Search"
                  className="flex h-[34px] w-9 items-center justify-center rounded-r-lg bg-brand-600 text-white transition hover:bg-brand-700 cursor-pointer"
                >
                  <SearchIcon />
                </button>
              </div>
            </div>
          </div>

          {/* Quotations Table */}
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pr-2 font-semibold min-w-32">Customer</th>
                  <th className="hidden sm:table-cell pb-2.5 pr-2 font-semibold min-w-40">Company</th>
                  <th className="pb-2.5 pr-2 font-semibold min-w-24">Mobile</th>
                  <th className="hidden md:table-cell pb-2.5 pr-2 font-semibold min-w-28">Staff</th>
                  <th className="hidden md:table-cell pb-2.5 pr-2 font-semibold min-w-20">Date</th>
                  <th className="pb-2.5 pr-2 font-semibold min-w-32">Status</th>
                  <th className="pb-2.5 pr-2 font-semibold text-left min-w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.length > 0 ? (
                  filteredQuotations.map((quote) => (
                    <tr
                      key={quote.id}
                      onClick={(e) => {
                        if (!quote.hasProposal) {
                          setOpenDropdownId(null)
                          handleOpenNewProposalModal(quote)
                        } else {
                          handleToggleMenu(e, quote.id, quote)
                        }
                      }}
                      className="text-slate-600 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      {/* Customer */}
                      <td className="py-0.5 pr-3 min-w-0">
                        <p className="font-semibold text-slate-900 text-xs truncate max-w-[160px]" title={quote.customer}>
                          {quote.customer}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {quote.category}
                        </p>
                      </td>

                      {/* Company */}
                      <td className="hidden sm:table-cell py-0.5 pr-3 min-w-0">
                        <p className="font-semibold text-slate-900 text-xs truncate max-w-[200px]" title={quote.company}>
                          {quote.company}
                        </p>
                        {quote.city && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {quote.city}
                          </p>
                        )}
                      </td>

                      {/* Mobile */}
                      <td className="py-0.5 pr-3">
                        <a
                          href={`tel:${quote.mobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-slate-800 hover:text-brand-600 font-medium inline-flex items-center gap-1"
                          title="Click to Call"
                        >
                          <PhoneCallIcon className="h-3 w-3 text-slate-400" />
                          <span>{quote.mobile}</span>
                        </a>
                      </td>

                      {/* Staff */}
                      <td className="hidden md:table-cell py-0.5 pr-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>{quote.staff || quote.qtnBy}</span>
                        </span>
                      </td>

                      {/* Date */}
                      <td className="hidden md:table-cell py-0.5 pr-3 font-mono text-[11px] text-slate-600">
                        {quote.date}
                      </td>

                      {/* Status Badge */}
                      <td className="py-0.5 pr-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                            quote.status === 'Quotation Requested'
                              ? 'border-purple-200 bg-purple-50 text-purple-700'
                              : quote.status === 'Not Sent'
                              ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                              : quote.status === 'Pending Approval'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : quote.status === 'Approved'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : quote.status === 'Rejected'
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              quote.status === 'Quotation Requested'
                                ? 'bg-purple-500'
                                : quote.status === 'Not Sent'
                                ? 'bg-cyan-500'
                                : quote.status === 'Pending Approval'
                                ? 'bg-amber-500 animate-pulse'
                                : quote.status === 'Approved'
                                ? 'bg-emerald-500'
                                : quote.status === 'Rejected'
                                ? 'bg-rose-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <span>{quote.status}</span>
                        </span>
                      </td>

                      {/* Action: 3-Dot Action Menu */}
                      <td className="py-0.5 pr-3 text-left">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleMenu(e, quote.id, quote)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                            title="Quotation Actions"
                          >
                            <MoreVerticalIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      {isLoading
                        ? 'Loading quotations...'
                        : error
                        ? error
                        : 'No quotation records found matching the criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Static Pagination Footer */}
          <div className="flex flex-col gap-2 items-start sm:flex-row sm:items-center sm:justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-medium">
              Showing 1 to {filteredQuotations.length} of {filteredQuotations.length} entries
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded-md bg-brand-50 text-brand-600 font-bold border border-brand-200/60"
              >
                1
              </button>
              <button
                type="button"
                className="px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>

          {/* Floating Action Popover (anchored to the card so it scrolls with the page) */}
          {openDropdownId && activeMenuQuote && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenDropdownId(null)
                }}
              />
              <div
                ref={menuRef}
                style={{ position: 'absolute', zIndex: 40 }}
                className="w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-950/5 animate-in fade-in zoom-in-95 duration-100"
              >
                {activeMenuQuote.hasProposal ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdownId(null)
                        handleViewProposal(activeMenuQuote)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                    >
                      <EyeIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span>View Proposal</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdownId(null)
                        handleOpenNewProposalModal(activeMenuQuote)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer"
                    >
                      <PencilIcon className="h-3.5 w-3.5 text-purple-600" />
                      <span>Edit Proposal</span>
                    </button>

                    {activeMenuQuote.status !== 'Pending Approval' &&
                      activeMenuQuote.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenApprovalModal(activeMenuQuote.id, e)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                        >
                          <SendIcon className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Send for Approval</span>
                        </button>
                      )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenDropdownId(null)
                      handleOpenNewProposalModal(activeMenuQuote)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                  >
                    <FileTextIcon className="h-3.5 w-3.5 text-blue-600" />
                    <span>Create Proposal</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdownId(null)
                    handleRequestRevertQuotation(activeMenuQuote, e)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <UndoIcon className="h-3.5 w-3.5 text-rose-600" />
                  <span>Revert to Telecalling</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Quotation History Card (Matching Old Software Screenshot) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
            <FileTextIcon className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Quotation History
            </h3>
          </div>

          {/* Quotation History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pr-2 font-semibold whitespace-nowrap">QTN ID</th>
                  <th className="hidden md:table-cell pb-2.5 pr-2 font-semibold whitespace-nowrap">Date</th>
                  <th className="pb-2.5 pr-2 font-semibold whitespace-nowrap">Amount</th>
                  <th className="hidden sm:table-cell pb-2.5 pr-2 font-semibold whitespace-nowrap">Discount</th>
                  <th className="hidden md:table-cell pb-2.5 pr-2 font-semibold whitespace-nowrap">QTN By</th>
                  <th className="hidden lg:table-cell pb-2.5 pr-2 font-semibold whitespace-nowrap">BDM</th>
                  <th className="pb-2.5 pr-2 font-semibold whitespace-nowrap">Status</th>
                  <th className="hidden md:table-cell pb-2.5 pr-2 font-semibold whitespace-nowrap">Remarks</th>
                  <th className="pb-2.5 pr-2 font-semibold text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((item) => (
                  <tr key={`hist-${item.id}`} onClick={() => handleViewProposal(item)} className="text-slate-600 hover:bg-slate-50/60 transition-colors cursor-pointer">
                    <td className="py-0.5 pr-3 font-mono font-bold text-slate-900 whitespace-nowrap">{item.id}</td>
                    <td className="hidden md:table-cell py-0.5 pr-3 font-mono text-[11px] whitespace-nowrap">{item.date}</td>
                    <td className="py-0.5 pr-3 font-mono font-semibold text-slate-900 whitespace-nowrap">₹{item.total}</td>
                    <td className="hidden sm:table-cell py-0.5 pr-3 font-mono text-slate-500 whitespace-nowrap">₹{item.discount}</td>
                    <td className="hidden md:table-cell py-0.5 pr-3 font-medium text-slate-800 truncate max-w-[140px]" title={item.qtnBy || item.staff}>{item.qtnBy || item.staff}</td>
                    <td className="hidden lg:table-cell py-0.5 pr-3 font-medium text-slate-800 truncate max-w-[140px]" title={item.bdm || 'Husna'}>{item.bdm || 'Husna'}</td>
                    <td className="py-0.5 pr-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                          item.status === 'Quotation Requested'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : item.status === 'Not Sent'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : item.status === 'Pending Approval'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell py-0.5 pr-3 text-slate-500 max-w-xs truncate">{item.remarks || item.notes || '-'}</td>
                    <td className="py-0.5 pr-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewProposal(item)
                          }}
                          className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="View Proposal Form"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenNewProposalModal(item)
                          }}
                          className="rounded p-1 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition"
                          title="Edit Proposal"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* "New Proposal" Modal (Matching User's Reference Screenshot) */}
      {proposalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !proposalDirty) setProposalModalOpen(false)
          }}
        >
          <div className="relative w-full max-w-3xl my-8 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header with Quick Template Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingProposalId ? 'Edit Proposal' : 'New Proposal'}
                </h3>

                {/* Quick Template Selector */}
                <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1" ref={templateDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setTemplateDropdownOpen((v) => !v)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <span className="max-w-40 truncate">
                      {(() => {
                        const tpl = resolveTemplate(selectedTemplateId)
                        return tpl ? tpl.name : 'Choose template'
                      })()}
                    </span>
                    <ChevronDownIcon className={`h-3.5 w-3.5 text-slate-500 transition-transform ${templateDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {templateDropdownOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1.5 max-h-72 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                        onClick={() => {
                          setTemplateDropdownOpen(false)
                          handleSelectTemplate('')
                        }}
                      >
                        <CloseIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-800">No Template (Blank Form)</span>
                      </div>
                      {savedTemplates.length > 0 && (
                        <>
                          <div className="sticky top-0 bg-white px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            My Templates
                          </div>
                          <div className="py-0.5">
                            {savedTemplates.map((tpl) => (
                              <div
                                key={`saved-${tpl.id}`}
                                className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-50 cursor-pointer group"
                                onClick={() => {
                                  setTemplateDropdownOpen(false)
                                  handleSelectTemplate(`saved-${tpl.id}`)
                                }}
                              >
                                <span className="flex-1 truncate text-xs font-medium text-slate-800">{tpl.name}</span>
                                <button
                                  type="button"
                                  title={`Delete "${tpl.name}"`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setTemplateDropdownOpen(false)
                                    setTemplateToDelete(tpl)
                                  }}
                                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      <div className="sticky top-0 bg-white px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        Pre-built Templates
                      </div>
                      <div className="py-0.5">
                        {PROPOSAL_TEMPLATES.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              setTemplateDropdownOpen(false)
                              handleSelectTemplate(tpl.id)
                            }}
                          >
                            <span className="text-xs font-medium text-slate-800">{tpl.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={requestCloseProposal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Scrollable Form Body */}
            {proposalLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                <div
                  className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin"
                  aria-label="Loading draft"
                />
              </div>
            )}
            <form
              onSubmit={handleSubmitProposal}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs"
              style={{ scrollbarGutter: 'stable' }}
            >
              {/* Row 1: BDM | QTN BY | Client Name in a single row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    BDM
                  </label>
                  <input
                    type="text"
                    placeholder="BDM Name"
                    value={bdm}
                    onChange={(e) => setBdm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    QTN BY
                  </label>
                  <input
                    type="text"
                    placeholder="Quotation By"
                    value={qtnBy}
                    onChange={(e) => setQtnBy(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Revision #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QTN403206072026A (Rev 2)"
                    value={revisionNo}
                    onChange={(e) => setRevisionNo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="Customer / Contact Person"
                    value={customerPerson}
                    onChange={(e) => {
                      setCustomerPerson(e.target.value)
                      clearError('customerPerson')
                    }}
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${validationErrors.customerPerson ? 'border-rose-400' : 'border-slate-300'}`}
                  />
                  {validationErrors.customerPerson && (
                    <p className="mt-1 text-[10px] font-semibold text-rose-600">
                      {validationErrors.customerPerson}
                    </p>
                  )}
                </div>
              </div>

              {/* Rich Text Editor 1 - Proposal Scope & Deliverables */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Scope &amp; Deliverables
                </label>
                <div className={`rounded-lg border overflow-hidden bg-white shadow-2xs ${validationErrors.scopeHtml ? 'border-rose-400' : 'border-slate-300'}`}>
                  <ReactQuill
                    theme="snow"
                    className="quill-tall"
                    value={scopeHtml}
                    onChange={(value) => {
                      setScopeHtml(
                        stripHtmlText(value).length > SCOPE_MAX_CHARS
                          ? clampRichHtml(value, SCOPE_MAX_CHARS)
                          : value,
                      )
                      clearError('scopeHtml')
                    }}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Enter detailed deliverables, software features, and module breakdown..."
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-400">
                    {validationErrors.scopeHtml ? (
                      <span className="text-rose-600">{validationErrors.scopeHtml}</span>
                    ) : (
                      `Maximum ${SCOPE_MAX_CHARS.toLocaleString()} characters`
                    )}
                  </p>
                  <p
                    className={`font-mono text-[10px] ${
                      stripHtmlText(scopeHtml).length >= SCOPE_MAX_CHARS
                        ? 'font-bold text-rose-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {stripHtmlText(scopeHtml).length.toLocaleString()} /{' '}
                    {SCOPE_MAX_CHARS.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Rich Text Editor 2 - Proposal in Detail */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Proposal in Detail
                </label>
                <div className={`rounded-lg border overflow-hidden bg-white shadow-2xs ${validationErrors.termsHtml ? 'border-rose-400' : 'border-slate-300'}`}>
                  <ReactQuill
                    theme="snow"
                    className="quill-tall"
                    value={termsHtml}
                    onChange={(value) => {
                      setTermsHtml(value)
                      clearError('termsHtml')
                    }}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Enter detailed technical architecture, module breakdown, milestone roadmap, SLA, warranty, and commercial terms..."
                  />
                </div>
                {validationErrors.termsHtml && (
                  <p className="mt-1 text-[10px] font-semibold text-rose-600">
                    {validationErrors.termsHtml}
                  </p>
                )}
              </div>

              {/* Financial & Source Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Total (₹)
                  </label>
                  <input
                    type="text"
                    placeholder="Total Amount"
                    value={totalVal}
                    onChange={(e) => {
                      setTotalVal(e.target.value)
                      clearError('totalVal')
                    }}
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${validationErrors.totalVal ? 'border-rose-400' : 'border-slate-300'}`}
                  />
                  {validationErrors.totalVal && (
                    <p className="mt-1 text-[10px] font-semibold text-rose-600">
                      {validationErrors.totalVal}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="text"
                    placeholder="Discount"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Source
                  </label>
                  <select
                    value={sourceVal}
                    onChange={(e) => setSourceVal(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="">Select Source</option>
                    {SOURCES.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currencyVal}
                    onChange={(e) => setCurrencyVal(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Remarks &amp; Notes
                </label>
                <input
                  type="text"
                  placeholder="Enter remarks or approval notes..."
                  value={remarksVal}
                  onChange={(e) => setRemarksVal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {submitMessage && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-700 text-center animate-in fade-in">
                  {submitMessage}
                </div>
              )}

              {/* Modal Footer Actions: left Save Draft + Save Template, right Close + Submit */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={editingSavedTemplate ? handleUpdateTemplate : openSaveTemplateDialog}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    {editingSavedTemplate ? 'Update Template' : usingPrebuiltTemplate ? 'Save As' : 'Save Template'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={requestCloseProposal}
                    className="rounded-md bg-slate-600 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-rose-600 px-5 py-2 text-xs font-medium text-white hover:bg-rose-700 transition cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "Send for Approval" Modal (Select Approving Admin) */}
      {approvalModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !approvalDirty) setApprovalModalOpen(false)
          }}
        >
          <div className="w-full max-w-md my-8 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <SendIcon className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Send for Approval</h3>
              </div>
              <button
                type="button"
                onClick={requestCloseApproval}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Selected Proposal Summary */}
              {(() => {
                const quote = quotationsList.find((q) => q.id === approvalQuoteId)
                if (!quote) return null
                return (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                          {quote.id}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                          {quote.company}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {quote.customer} • ₹{quote.netAmount}
                        </p>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                          quote.status === 'Pending Approval'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {quote.status}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* Approver Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Select Approving Admins <span className="text-rose-500">*</span>
                </label>
                <div className="rounded-lg border border-slate-300 bg-white divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {approverOptions.length === 0 && (
                    <p className="px-3 py-2.5 text-[11px] text-slate-400">No approvers available.</p>
                  )}
                  {approverOptions.map((admin) => {
                    const checked = selectedApprovers.includes(admin.id)
                    return (
                      <label
                        key={admin.id}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleApprover(admin.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-slate-800 truncate">
                            {admin.name}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {admin.role ? admin.role : 'Approver'}
                            {admin.is_superuser ? ' · Super Admin' : ''}
                          </span>
                        </span>
                        {checked && (
                          <span className="text-[10px] font-bold text-emerald-600">✓ Selected</span>
                        )}
                      </label>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-[10.5px] text-slate-400 leading-relaxed">
                  Every selected admin must approve this proposal before it can be sent to the client.
                </p>
              </div>

              {/* Success Message */}
              {approvalSent && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-700 text-center animate-in fade-in">
                  {approvalSent}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={requestCloseApproval}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendForApproval}
                disabled={selectedApprovers.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendIcon className="h-3.5 w-3.5" />
                Send for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Confirms */}
      <ConfirmDialog
        open={discardProposalOpen}
        title="Save draft before closing?"
        message="You have unsaved changes. You can save a draft to keep your work, or discard it before closing."
        cancelLabel="Keep Editing"
        confirmLabel="Discard"
        extraLabel="Save Draft"
        onExtra={handleSaveDraftAndClose}
        onCancel={() => setDiscardProposalOpen(false)}
        onConfirm={() => {
          setDiscardProposalOpen(false)
          setProposalModalOpen(false)
          resetProposalDirty()
        }}
      />
      <ConfirmDialog
        open={discardApprovalOpen}
        onCancel={() => setDiscardApprovalOpen(false)}
        onConfirm={() => {
          setDiscardApprovalOpen(false)
          setApprovalModalOpen(false)
          resetApprovalDirty()
        }}
      />

      {/* Revert to Telecalling Confirm */}
      <ConfirmDialog
        open={!!revertQuote}
        title="Revert to Telecalling?"
        message={`"${revertQuote?.customer}" (${revertQuote?.id}) will be removed from quotations and sent back to the Telecalling pipeline. Continue?`}
        cancelLabel="Cancel"
        confirmLabel="Revert"
        onCancel={() => setRevertQuote(null)}
        onConfirm={handleConfirmRevertQuotation}
      />

      {/* Warn before replacing existing form content with a template */}
      <ConfirmDialog
        open={templateOverrideOpen}
        title={pendingTemplateId ? 'Replace current content?' : 'Clear current content?'}
        message={
          pendingTemplateId
            ? 'You already have content in this proposal. Applying a template will replace the current fields. Do you want to continue?'
            : 'You already have content in this proposal. Choosing no template will clear the template-related fields. Do you want to continue?'
        }
        cancelLabel="Cancel"
        confirmLabel={pendingTemplateId ? 'Replace' : 'Clear'}
        onCancel={cancelTemplateOverride}
        onConfirm={confirmTemplateOverride}
      />

      {/* Confirm deleting a saved template */}
      <ConfirmDialog
        open={!!templateToDelete}
        title="Delete template?"
        message={`"${templateToDelete?.name}" will be permanently removed from your templates. This cannot be undone. Continue?`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
        onCancel={() => setTemplateToDelete(null)}
        onConfirm={handleDeleteTemplate}
      />

      {/* Save Template name dialog */}
      {saveTemplateOpen && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSaveTemplateOpen(false)
          }}
        >
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5">
              <h3 className="text-sm font-bold text-slate-900">
                {usingPrebuiltTemplate ? 'Save As' : 'Save Template'}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Save the current proposal content as a template so you can reuse it later in the
                "Choose template" dropdown.
              </p>
              <label className="mt-4 block text-[11px] font-bold text-slate-700 mb-1">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Hospital Management System"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveTemplate()
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setSaveTemplateOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition cursor-pointer shadow-xs"
              >
                {usingPrebuiltTemplate ? 'Save As' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
