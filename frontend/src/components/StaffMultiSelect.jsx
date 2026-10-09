import { useEffect, useMemo, useRef, useState } from 'react'

// Full literal class strings per accent — Tailwind cannot see interpolated names.
const ACCENTS = {
  emerald: {
    open: 'border-emerald-500 ring-2 ring-emerald-500/10',
    ok: 'bg-emerald-600',
    checkbox: 'text-emerald-600 focus:ring-emerald-500',
  },
  brand: {
    open: 'border-brand-500 ring-2 ring-brand-500/10',
    ok: 'bg-brand-600',
    checkbox: 'text-brand-600 focus:ring-brand-500',
  },
}

function defaultFormatSummary(names) {
  const joined = names.join(', ')
  const maxLen = 42
  if (joined.length <= maxLen) return joined
  let cut = joined.slice(0, maxLen)
  const lastComma = cut.lastIndexOf(', ')
  if (lastComma > 0) cut = cut.slice(0, lastComma)
  return `${cut}…`
}

function RoleRow({ role, state, onToggle, checkboxClass }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state.indeterminate
  }, [state.indeterminate])
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
      <input
        ref={ref}
        type="checkbox"
        checked={state.checked}
        onChange={onToggle}
        className={`h-4 w-4 rounded border-slate-300 cursor-pointer ${checkboxClass}`}
      />
      <span className="font-semibold text-slate-800">{role.label}</span>
      <span className="text-[11px] text-slate-400">({role.names.length})</span>
    </label>
  )
}

/**
 * Multi-select staff picker with a collapsible role checklist.
 *
 * Ticking a role bulk-adds every member of that role to the selection; ticking
 * an individual staff member adds/removes only that person. A role shows the
 * indeterminate state when only some of its members are selected. Because
 * role ticks simply mutate the selection, users can bulk-pick from one role and
 * then add or remove people from any other role.
 */
export default function StaffMultiSelect({
  staff,
  selected,
  onChange,
  open,
  onOpenChange,
  accent = 'emerald',
  placeholder = 'Select staff members…',
  emptyText = 'No assignable staff',
  formatSummary = defaultFormatSummary,
}) {
  const [roleOpen, setRoleOpen] = useState(false)
  const tokens = ACCENTS[accent] ?? ACCENTS.emerald
  const selectedSet = useMemo(() => new Set(selected), [selected])

  // Group staff by role, preserving first-seen order. Blank roles group together.
  const roles = useMemo(() => {
    const map = new Map()
    for (const s of staff) {
      const label = s.role && s.role.trim() ? s.role : 'No role'
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(s.name)
    }
    return [...map.entries()].map(([label, names]) => ({ label, names }))
  }, [staff])

  const allNames = staff.map((s) => s.name)
  const allSelected = allNames.length > 0 && allNames.every((n) => selectedSet.has(n))

  function toggleStaff(name) {
    onChange(selectedSet.has(name) ? selected.filter((n) => n !== name) : [...selected, name])
  }

  function toggleAll() {
    onChange(allSelected ? [] : allNames)
  }

  function roleState(names) {
    const count = names.filter((n) => selectedSet.has(n)).length
    return {
      checked: names.length > 0 && count === names.length,
      indeterminate: count > 0 && count < names.length,
    }
  }

  function toggleRole(names) {
    if (roleState(names).checked) {
      const remove = new Set(names)
      onChange(selected.filter((n) => !remove.has(n)))
    } else {
      const add = names.filter((n) => !selectedSet.has(n))
      onChange([...selected, ...add])
    }
  }

  // Closing the outer panel also collapses the nested role checklist.
  function setPanelOpen(next) {
    if (!next) setRoleOpen(false)
    onOpenChange(next)
  }

  return (
    <div className="relative mt-1">
      {/* Multi-select trigger */}
      <button
        type="button"
        onClick={() => setPanelOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-slate-50/50 px-3 py-2 text-left text-xs transition cursor-pointer ${
          open ? tokens.open : 'border-slate-300'
        }`}
      >
        <span className={`truncate font-semibold ${selected.length === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
          {selected.length === 0 ? placeholder : formatSummary(selected)}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {open && (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold text-white cursor-pointer ${tokens.ok}`}
              onClick={(e) => {
                e.stopPropagation()
                setPanelOpen(false)
              }}
            >
              OK
            </span>
          )}
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Checkbox dropdown panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPanelOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {staff.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">{emptyText}</p>
            ) : (
              <>
                {/* Select by role */}
                <div className="border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRoleOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>Select by role{roles.length > 0 ? ` (${roles.length})` : ''}</span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${roleOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {roleOpen && (
                    <div className="max-h-36 overflow-y-auto pb-1">
                      {roles.map((role) => (
                        <RoleRow
                          key={role.label}
                          role={role}
                          state={roleState(role.names)}
                          onToggle={() => toggleRole(role.names)}
                          checkboxClass={tokens.checkbox}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* All staff */}
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className={`h-4 w-4 rounded border-slate-300 cursor-pointer ${tokens.checkbox}`}
                  />
                  <span className="font-semibold text-slate-800">All staff</span>
                </label>

                {/* Staff list */}
                <div className="max-h-48 overflow-y-auto">
                  {staff.map((s) => (
                    <label
                      key={s.name}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(s.name)}
                        onChange={() => toggleStaff(s.name)}
                        className={`h-4 w-4 rounded border-slate-300 cursor-pointer ${tokens.checkbox}`}
                      />
                      <span className="font-semibold text-slate-800">{s.name}</span>
                      {s.role && <span className="text-[11px] text-slate-400">({s.role})</span>}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
