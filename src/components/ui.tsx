import type { MouseEvent } from 'react'
import { category } from '../model/categories'
import type { CategoryId } from '../model/types'

const ICONS = {
  grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  x: 'M6 6l12 12M18 6L6 18',
  printer: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  repeat: 'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
  carried: 'M4 4v7a4 4 0 0 0 4 4h12M15 10l5 5-5 5',
  inbox: 'M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff:
    'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
}

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const strokeWidth = name === 'grip' || name === 'more' ? 3 : 1.8
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

export function IconButton({
  icon,
  label,
  onClick,
  className = '',
}: {
  icon: IconName
  label: string
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
}) {
  return (
    <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} />
    </button>
  )
}

/** Colored on screen; the printed page uses plain letter tags. */
export function CategoryTag({ id }: { id: CategoryId }) {
  const c = category(id)
  return (
    <span className={`tag tag-${id}`} title={c.name}>
      {c.letter}
    </span>
  )
}
