// All dates are local calendar dates stored as YYYY-MM-DD strings, so a week
// never shifts when the browser's timezone or daylight saving changes.

import type { Weekday } from './types'

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6]
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Monday of the week containing `d`. */
export function mondayOf(d: Date): string {
  const offset = (d.getDay() + 6) % 7
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
  return toISODate(monday)
}

/**
 * The week you'd plan on a given day: on Sunday that's the week starting
 * tomorrow, any other day it's the week you're in.
 */
export function planningWeekStart(today: Date): string {
  const monday = mondayOf(today)
  return today.getDay() === 0 ? addDays(monday, 7) : monday
}

/** The week after `current`, or the week you'd plan today if you've skipped some. */
export function nextWeekStart(current: string, today: Date): string {
  const following = addDays(current, 7)
  const planning = planningWeekStart(today)
  return planning > following ? planning : following
}

/**
 * The month a week's goals belong to: whichever month holds its Thursday,
 * i.e. most of its days (the same rule ISO week numbers use).
 */
export function goalMonthOf(weekStart: string): string {
  return addDays(weekStart, 3).slice(0, 7)
}

export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
}

export function monthName(month: string): string {
  return MONTH_LONG[Number(month.slice(5, 7)) - 1]
}

/** "Oct 26 – Nov 1" */
export function formatWeekRange(weekStart: string): string {
  const a = parseISODate(weekStart)
  const b = parseISODate(addDays(weekStart, 6))
  const left = `${MONTH_SHORT[a.getMonth()]} ${a.getDate()}`
  const right = a.getMonth() === b.getMonth() ? `${b.getDate()}` : `${MONTH_SHORT[b.getMonth()]} ${b.getDate()}`
  return `${left} – ${right}`
}

/** "Oct 26" */
export function formatShortDate(s: string): string {
  const d = parseISODate(s)
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`
}

/** Day of the month for a weekday in the given week. */
export function dayOfMonth(weekStart: string, day: Weekday): number {
  return parseISODate(addDays(weekStart, day)).getDate()
}
