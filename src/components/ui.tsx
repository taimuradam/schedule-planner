import { useState, type FormEvent, type ReactNode } from 'react'
import { CATEGORIES, category, nextCategory } from '../model/categories'
import type { CategoryId } from '../model/types'

const ICONS = {
  grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  x: 'M6 6l12 12M18 6L6 18',
  printer: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  plus: 'M12 5v14M5 12h14',
  repeat: 'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
  carried: 'M4 4v7a4 4 0 0 0 4 4h12M15 10l5 5-5 5',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
}

export function Icon({ name, size = 16 }: { name: keyof typeof ICONS; size?: number }) {
  const strokeWidth = name === 'grip' ? 3 : 1.8
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

/** Colored on screen; the printed page uses plain letter tags instead. */
export function CategoryTag({ id, onChange }: { id: CategoryId; onChange?: (id: CategoryId) => void }) {
  const c = category(id)
  if (!onChange) {
    return (
      <span className={`tag tag-${id}`} title={c.name}>
        {c.letter}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={`tag tag-${id} tag-button`}
      title={`${c.name}. Click to change category`}
      aria-label={`Category: ${c.name}. Change category`}
      onClick={() => onChange(nextCategory(id))}
    >
      {c.letter}
    </button>
  )
}

/** Shows just the letter, matching the tags; the legend spells them out. */
export function CategorySelect({ value, onChange }: { value: CategoryId; onChange: (id: CategoryId) => void }) {
  return (
    <select
      className={`select tag-select tag-${value}`}
      aria-label="Category"
      title={category(value).name}
      value={value}
      onChange={(e) => onChange(e.target.value as CategoryId)}
    >
      {CATEGORIES.map((c) => (
        <option key={c.id} value={c.id} aria-label={c.name}>
          {c.letter}
        </option>
      ))}
    </select>
  )
}

/** Text that turns into an input on click. Saving an empty value is ignored. */
export function EditableText({ value, onSave, className = '' }: { value: string; onSave: (text: string) => void; className?: string }) {
  const [draft, setDraft] = useState<string | null>(null)

  if (draft === null) {
    return (
      <button type="button" className={`editable ${className}`} title="Click to edit" onClick={() => setDraft(value)}>
        {value}
      </button>
    )
  }

  const commit = () => {
    const text = draft.trim()
    if (text && text !== value) onSave(text)
    setDraft(null)
  }

  return (
    <input
      className={`input editable-input ${className}`}
      aria-label="Edit text"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}

export function IconButton({
  icon,
  label,
  onClick,
  className = '',
}: {
  icon: keyof typeof ICONS
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} />
    </button>
  )
}

/**
 * Text field that adds an item on Enter. Remembers the last category picked,
 * since you tend to add several things of the same kind in a row.
 */
export function AddItemForm({
  placeholder,
  label,
  onAdd,
  fixedCategory,
  compact = false,
  before,
}: {
  placeholder: string
  label: string
  onAdd: (text: string, category: CategoryId) => void
  fixedCategory?: CategoryId
  compact?: boolean
  before?: ReactNode
}) {
  const [text, setText] = useState('')
  const [cat, setCat] = useState<CategoryId>(fixedCategory ?? 'job')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text, fixedCategory ?? cat)
    setText('')
  }

  return (
    <form className={`add-form${compact ? ' add-form-compact' : ''}`} onSubmit={submit}>
      {before}
      {!fixedCategory && <CategorySelect value={cat} onChange={setCat} />}
      <input
        className="input"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="icon-button add-button" aria-label={label} title={label}>
        <Icon name="plus" />
      </button>
    </form>
  )
}
