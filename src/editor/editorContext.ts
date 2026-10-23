import { createContext, useContext } from 'react'
import type { CategoryId, PlannerState } from '../model/types'

export interface Editor {
  /** New lines start in whichever category you used last. */
  lastCategory: CategoryId
  setLastCategory: (category: CategoryId) => void
  /** Shows a short message, with an Undo that restores `undo` if given. */
  notify: (text: string, undo?: PlannerState) => void
}

export const EditorContext = createContext<Editor | null>(null)

export function useEditor(): Editor {
  const editor = useContext(EditorContext)
  if (!editor) throw new Error('useEditor must be used inside EditorContext')
  return editor
}
