import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from '../components/ui'
import { CATEGORIES } from '../model/categories'
import type { CategoryId } from '../model/types'

const ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)'

/**
 * A small popup menu anchored to a button. It sits outside the page so day
 * columns can't clip it, and closes on Escape, scrolling, or a click elsewhere.
 */
export function Menu({
  anchor,
  label,
  onClose,
  children,
}: {
  anchor: HTMLElement
  label: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return
    const a = anchor.getBoundingClientRect()
    const m = menu.getBoundingClientRect()
    const left = Math.max(8, Math.min(a.right - m.width, window.innerWidth - m.width - 8))
    const below = a.bottom + 4
    const top = below + m.height > window.innerHeight - 8 ? Math.max(8, a.top - m.height - 4) : below
    setPos({ top, left })
    menu.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus()
  }, [anchor])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!ref.current?.contains(target) && !anchor.contains(target)) onClose()
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onClose()
      anchor.focus()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  const onKeyDown = (e: KeyboardEvent) => {
    // Escape is handled on the document; mark it so panels behind the menu
    // (like the backlog drawer) don't close as well.
    if (e.key === 'Escape') e.preventDefault()
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? i + 1 : i - 1
    items[(next + items.length) % items.length]?.focus()
  }

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className="menu"
      style={pos ?? { top: -9999, left: -9999 }}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>,
    document.body,
  )
}

export function MenuItem({
  icon,
  children,
  onSelect,
  danger = false,
  disabled = false,
}: {
  icon?: IconName
  children: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`menu-item${danger ? ' menu-item-danger' : ''}`}
      disabled={disabled}
      onClick={onSelect}
    >
      {icon ? <Icon name={icon} /> : <span className="menu-item-spacer" />}
      {children}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="menu-label">{children}</div>
}

export function MenuDivider() {
  return <div className="menu-divider" role="separator" />
}

export function MenuCategories({ value, onChange }: { value: CategoryId; onChange: (id: CategoryId) => void }) {
  return (
    <div className="menu-chips" role="group" aria-label="Category">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="menuitemradio"
          aria-checked={value === c.id}
          className={`chip tag-${c.id}`}
          title={c.name}
          onClick={() => onChange(c.id)}
        >
          {c.letter}
        </button>
      ))}
    </div>
  )
}

/** The "⋯" button that opens an item's menu. Shown on hover or focus. */
export function MoreButton({
  label,
  open,
  onOpen,
}: {
  label: string
  open: boolean
  onOpen: (anchor: HTMLElement) => void
}) {
  return (
    <button
      type="button"
      className="more-button"
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      title="More"
      onClick={(e) => onOpen(e.currentTarget)}
    >
      <Icon name="more" size={14} />
    </button>
  )
}
