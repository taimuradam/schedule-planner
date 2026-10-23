import { isCategoryId } from './categories'
import type { PlannerState, Week } from './types'

const STORAGE_KEY = 'weekly-planner:v1'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isWeekday = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6

function isItem(v: unknown): v is Obj {
  return isObj(v) && isStr(v.id) && isStr(v.text) && isCategoryId(v.category)
}

/** Repeating tasks used to have a single `weekday`; read those as one-day lists. */
function readRepeating(v: unknown): Obj | null {
  if (!isItem(v)) return null
  if (Array.isArray(v.weekdays) && v.weekdays.every(isWeekday)) return v
  if (!isWeekday(v.weekday)) return null
  const { weekday, ...rest } = v
  return { ...rest, weekdays: [weekday] }
}

/** Daily tasks saved before they could skip days are done every day. */
function readDaily(v: unknown): Obj | null {
  if (!isItem(v) || typeof v.active !== 'boolean') return null
  if (v.days === undefined) return { ...v, days: [0, 1, 2, 3, 4, 5, 6] }
  return Array.isArray(v.days) && v.days.length > 0 && v.days.every(isWeekday) ? v : null
}

function isWeek(v: unknown): v is Week {
  return (
    isObj(v) &&
    isStr(v.start) &&
    DATE_RE.test(v.start) &&
    typeof v.reviewed === 'boolean' &&
    Array.isArray(v.tasks) &&
    v.tasks.every((t) => isItem(t) && isWeekday(t.day) && typeof t.done === 'boolean')
  )
}

/**
 * Checks that something read from storage or an imported file has the shape
 * of planner data. Returns null rather than a half-valid state.
 */
export function parseState(raw: unknown): PlannerState | null {
  if (!isObj(raw) || raw.version !== 1) return null
  const { goals, dailyTasks, repeating, backlog, weeks, currentWeek } = raw
  if (!Array.isArray(goals) || !goals.every((g) => isItem(g) && isStr(g.month) && MONTH_RE.test(g.month))) return null
  const daily = Array.isArray(dailyTasks) ? dailyTasks.map(readDaily) : [null]
  if (daily.some((t) => t === null)) return null
  const rules = Array.isArray(repeating) ? repeating.map(readRepeating) : [null]
  if (rules.some((r) => r === null)) return null
  if (!Array.isArray(backlog) || !backlog.every(isItem)) return null
  if (!isObj(weeks) || !Object.values(weeks).every(isWeek)) return null
  if (!isStr(currentWeek) || !(currentWeek in weeks)) return null
  return { ...raw, dailyTasks: daily, repeating: rules } as unknown as PlannerState
}

export function loadState(): PlannerState | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? parseState(JSON.parse(text)) : null
  } catch {
    return null
  }
}

export function saveState(state: PlannerState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function downloadBackup(state: PlannerState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `weekly-planner-${state.currentWeek}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readBackup(file: File): Promise<PlannerState | null> {
  try {
    return parseState(JSON.parse(await file.text()))
  } catch {
    return null
  }
}
