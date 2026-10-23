import { CATEGORIES } from '../model/categories'
import type { CategoryId } from '../model/types'

// Words accepted after "#", beyond each category's letter and id.
const ALIASES: Record<string, CategoryId> = { hw: 'school', homework: 'school', jobs: 'job' }

function categoryFromToken(word: string): CategoryId | undefined {
  const w = word.toLowerCase()
  const match = CATEGORIES.find((c) => c.letter.toLowerCase() === w || c.id === w)
  return match?.id ?? ALIASES[w]
}

/**
 * Pulls a category tag like "#j" out of typed text. While typing, a tag only
 * counts once a space follows it, so "#ja…" isn't cut short; on submit
 * (`final`) a tag at the very end counts too. Unknown tags are left as text.
 */
export function extractCategory(text: string, final: boolean): { text: string; category?: CategoryId } {
  const re = final ? /(^|\s)#([a-z]+)(?=\s|$)/gi : /(^|\s)#([a-z]+)(?=\s)/gi
  let category: CategoryId | undefined
  const rest = text.replace(re, (match, lead: string, word: string) => {
    const found = categoryFromToken(word)
    if (!found) return match
    category = found
    return lead
  })
  if (!category) return { text }
  const cleaned = rest.replace(/\s{2,}/g, ' ').replace(/^\s+/, '')
  // Keep a trailing space while typing so the next word doesn't run on.
  return { text: final ? cleaned.trim() : cleaned, category }
}
