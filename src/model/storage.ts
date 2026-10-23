import { isCategoryId } from './categories'
import { groupByCategory } from './planner'
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

const isDone = (v: unknown) => isItem(v) && typeof v.done === 'boolean'

function readWeek(v: unknown): Week | null {
  if (!isObj(v) || !isStr(v.start) || !DATE_RE.test(v.start) || typeof v.reviewed !== 'boolean') return null
  if (!Array.isArray(v.tasks) || !v.tasks.every((t) => isDone(t) && isWeekday((t as Obj).day))) return null
  if (v.habits !== undefined && !(Array.isArray(v.habits) && v.habits.every(isItem))) return null
  // Weeks saved while the planner had a "Top 3" section carry a `focus` list; it's dropped.
  const { focus: _dropped, ...week } = v
  return week as unknown as Week
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
  if (!isObj(weeks)) return null
  const readWeeks: Record<string, Week> = {}
  for (const [start, week] of Object.entries(weeks)) {
    const read = readWeek(week)
    if (!read) return null
    // Days you haven't arranged by hand are kept grouped by category.
    readWeeks[start] = read.reviewed ? read : groupByCategory(read)
  }
  if (!isStr(currentWeek) || !(currentWeek in weeks)) return null
  return { ...raw, dailyTasks: daily, repeating: rules, weeks: readWeeks } as unknown as PlannerState
}

export interface Loaded {
  state: PlannerState | null
  /** Saved data that couldn't be read. It's kept, never overwritten. */
  unreadable: string | null
}

export function loadState(): Loaded {
  let text: string | null = null
  try {
    text = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { state: null, unreadable: null }
  }
  if (!text) return { state: null, unreadable: null }
  let state: PlannerState | null = null
  try {
    state = parseState(JSON.parse(text))
  } catch {
    state = null
  }
  if (state) return { state, unreadable: null }
  // Starting fresh will save over the main key, so put the old data aside first.
  try {
    localStorage.setItem(`${STORAGE_KEY}:unreadable:${Date.now()}`, text)
  } catch {
    // Still offered as a download below.
  }
  return { state: null, unreadable: text }
}

/** Asks the browser not to clear the planner's storage to free up space. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => undefined)
}

export function saveState(state: PlannerState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function downloadFile(name: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadBackup(state: PlannerState): void {
  downloadFile(`weekly-planner-${state.currentWeek}.json`, JSON.stringify(state, null, 2))
}

export async function readBackup(file: File): Promise<PlannerState | null> {
  try {
    return parseState(JSON.parse(await file.text()))
  } catch {
    return null
  }
}
