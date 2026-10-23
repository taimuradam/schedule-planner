import { useRef, useState } from 'react'
import { CATEGORIES, category as categoryOf } from '../model/categories'
import type { CategoryId } from '../model/types'
import { extractCategory } from './categoryTokens'
import { useEditor } from './editorContext'

/**
 * One text field for writing a line, with J/S/H chips to set its category.
 * Typing #j, #s or #h sets the category from the keyboard. Enter saves,
 * Escape cancels, and clicking away saves whatever was typed.
 */
export function LineEditor({
  initialText = '',
  initialCategory,
  placeholder,
  label,
  chips = 'inline',
  repeat = false,
  persistent = false,
  onSubmit,
  onClose,
}: {
  initialText?: string
  initialCategory?: CategoryId
  placeholder: string
  label: string
  chips?: 'inline' | 'below'
  /** Stay open after each entry, for adding several in a row. */
  repeat?: boolean
  /** Always open, like the backlog's add field. */
  persistent?: boolean
  onSubmit: (text: string, category: CategoryId) => void
  onClose?: () => void
}) {
  const editor = useEditor()
  const [text, setText] = useState(initialText)
  const [cat, setCat] = useState<CategoryId>(initialCategory ?? editor.lastCategory)
  const inputRef = useRef<HTMLInputElement>(null)
  // Set once the editor has saved or cancelled, so the blur that follows
  // (focus leaving a field that's going away) doesn't save a second time.
  const finished = useRef(false)

  const choose = (c: CategoryId) => {
    setCat(c)
    editor.setLastCategory(c)
  }

  const close = () => {
    if (persistent) {
      setText('')
      return
    }
    finished.current = true
    onClose?.()
  }

  const commit = (keepOpen: boolean) => {
    const parsed = extractCategory(text, true)
    const category = parsed.category ?? cat
    if (parsed.text) {
      onSubmit(parsed.text, category)
      editor.setLastCategory(category)
    }
    if (parsed.text && keepOpen) {
      setText('')
      setCat(category)
      return
    }
    close()
  }

  return (
    <div className={`line-editor line-editor-chips-${chips}`}>
      <input
        ref={inputRef}
        className="line-editor-input"
        aria-label={label}
        placeholder={placeholder}
        autoFocus
        value={text}
        onChange={(e) => {
          const parsed = extractCategory(e.target.value, false)
          if (parsed.category) choose(parsed.category)
          setText(parsed.text)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(repeat || persistent)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            close()
          }
        }}
        onBlur={() => {
          if (!persistent && !finished.current) commit(false)
        }}
      />
      <span className="chips" role="group" aria-label={`Category: ${categoryOf(cat).name}`}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            tabIndex={-1}
            className={`chip tag-${c.id}`}
            aria-pressed={cat === c.id}
            title={`${c.name} (#${c.letter.toLowerCase()})`}
            // Keep focus in the field so choosing a chip doesn't count as clicking away.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              choose(c.id)
              inputRef.current?.focus()
            }}
          >
            {c.letter}
          </button>
        ))}
      </span>
    </div>
  )
}
