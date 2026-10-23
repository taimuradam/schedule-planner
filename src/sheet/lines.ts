import { createContext, useState, type MouseEvent } from 'react'
import type { CategoryId, Weekday } from '../model/types'

// Empty rows left for writing in by hand during the week.
export const MIN_GOAL_ROWS = 3
export const MIN_DAILY_ROWS = 4
export const BLANK_DAY_LINES = 24

export function blanks(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => i)
}

export type DragData =
  | { kind: 'task'; id: string; text: string; category: CategoryId }
  | { kind: 'backlog'; id: string; text: string; category: CategoryId }

export const dayDropId = (day: Weekday) => `day-${day}`

/** Each task row is also a drop target, so a task can be dropped at an exact spot. */
export const slotDropId = (taskId: string) => `slot:${taskId}`

/** Where a dragged task would land: just before or after another task. */
export interface DropSpot {
  taskId: string
  before: boolean
}

export const DropSpotContext = createContext<DropSpot | null>(null)

/** The week on the page and today's date, for labelling due dates. */
export const SheetDatesContext = createContext({ weekStart: '', today: '' })

/** Rename-in-place and "⋯" menu state shared by every editable line. */
export function useLine() {
  const [renaming, setRenaming] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  return {
    renaming,
    startRename: () => setRenaming(true),
    stopRename: () => setRenaming(false),
    menuAnchor,
    openMenu: setMenuAnchor,
    closeMenu: () => setMenuAnchor(null),
    // Right-click opens the same menu as the "⋯" button.
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      const more = e.currentTarget.querySelector<HTMLElement>('.more-button')
      if (!more) return
      e.preventDefault()
      setMenuAnchor(more)
    },
  }
}
