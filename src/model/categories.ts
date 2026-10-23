import type { Category, CategoryId } from './types'

export const CATEGORIES: readonly Category[] = [
  { id: 'job', letter: 'J', name: 'Job search' },
  { id: 'side', letter: 'S', name: 'Side projects' },
  { id: 'school', letter: 'H', name: 'Homework' },
  { id: 'personal', letter: 'P', name: 'Personal' },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

export function category(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as string[]).includes(value)
}
