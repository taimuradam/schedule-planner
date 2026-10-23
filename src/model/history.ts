import { CATEGORY_IDS } from './categories'
import { addDays } from './dates'
import type { CategoryId, PlannerState, Week } from './types'

export interface Tally {
  done: number
  total: number
}

export interface WeekSummary {
  start: string
  tasks: Tally
  byCategory: Record<CategoryId, Tally>
  /** Missing when habits weren't ticked off in that week's review. */
  habits?: Tally
}

const tally = (items: { done: boolean }[]): Tally => ({
  done: items.filter((i) => i.done).length,
  total: items.length,
})

/** Weeks that have been wrapped up, newest first. */
export function pastWeeks(state: PlannerState): Week[] {
  return Object.values(state.weeks)
    .filter((w) => w.reviewed)
    .sort((a, b) => b.start.localeCompare(a.start))
}

export function summarizeWeek(week: Week): WeekSummary {
  const byCategory = Object.fromEntries(
    CATEGORY_IDS.map((id) => [id, tally(week.tasks.filter((t) => t.category === id))]),
  ) as Record<CategoryId, Tally>
  const habits = week.habits && {
    done: week.habits.reduce((n, h) => n + h.done.filter((d) => h.days.includes(d)).length, 0),
    total: week.habits.reduce((n, h) => n + h.days.length, 0),
  }
  return { start: week.start, tasks: tally(week.tasks), byCategory, ...(habits && { habits }) }
}

export interface Streak {
  id: string
  text: string
  category: CategoryId
  /** Scheduled days in a row it was done, counting back from the latest review. */
  days: number
}

/**
 * Current streak for each habit you still have: scheduled days done in a row,
 * walking back through consecutive reviewed weeks. A missed day, a week
 * without habit ticks, or a gap between weeks ends it. Skipped days (the
 * dashes on paper) don't break it.
 */
export function habitStreaks(state: PlannerState): Streak[] {
  const weeks = pastWeeks(state)
  return state.dailyTasks
    .filter((t) => t.active)
    .map((habit) => {
      let days = 0
      let expected = weeks[0]?.start
      outer: for (const week of weeks) {
        if (week.start !== expected) break
        const log = week.habits?.find((h) => h.id === habit.id)
        if (!log) break
        for (const day of [...log.days].sort((a, b) => b - a)) {
          if (!log.done.includes(day)) break outer
          days += 1
        }
        expected = addDays(week.start, -7)
      }
      return { id: habit.id, text: habit.text, category: habit.category, days }
    })
}
