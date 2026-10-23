import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayOfMonth,
  dueLabel,
  formatWeekRange,
  goalMonthOf,
  mondayOf,
  nextWeekStart,
  planningWeekStart,
  previousMonth,
} from './dates'

// new Date(y, m, d) is local time, matching how the app reads "today".
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)

describe('week boundaries', () => {
  it('finds the Monday of any day in the week', () => {
    expect(mondayOf(day(2026, 10, 19))).toBe('2026-10-19') // Monday
    expect(mondayOf(day(2026, 10, 22))).toBe('2026-10-19') // Thursday
    expect(mondayOf(day(2026, 10, 25))).toBe('2026-10-19') // Sunday
  })

  it('plans next week on Sunday and this week on other days', () => {
    expect(planningWeekStart(day(2026, 10, 25))).toBe('2026-10-26') // Sunday
    expect(planningWeekStart(day(2026, 10, 24))).toBe('2026-10-19') // Saturday
    expect(planningWeekStart(day(2026, 10, 19))).toBe('2026-10-19') // Monday
  })

  it('goes to the following week, or jumps ahead after skipped weeks', () => {
    expect(nextWeekStart('2026-10-19', day(2026, 10, 25))).toBe('2026-10-26')
    expect(nextWeekStart('2026-10-19', day(2026, 10, 21))).toBe('2026-10-26')
    expect(nextWeekStart('2026-10-05', day(2026, 11, 1))).toBe('2026-11-02')
  })

  it('crosses month, year and daylight saving boundaries', () => {
    expect(addDays('2026-10-26', 6)).toBe('2026-11-01')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02') // US clocks change Nov 1
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09') // and Mar 8
  })
})

describe('goal months', () => {
  it('assigns a week to the month holding its Thursday', () => {
    expect(goalMonthOf('2026-10-26')).toBe('2026-10') // Thu Oct 29
    expect(goalMonthOf('2026-11-30')).toBe('2026-12') // Thu Dec 3
    expect(goalMonthOf('2026-12-28')).toBe('2026-12') // Thu Dec 31
  })

  it('steps back across a year boundary', () => {
    expect(previousMonth('2027-01')).toBe('2026-12')
    expect(previousMonth('2026-11')).toBe('2026-10')
  })
})

describe('labels', () => {
  it('formats week ranges within and across months', () => {
    expect(formatWeekRange('2026-10-19')).toBe('Oct 19 – 25')
    expect(formatWeekRange('2026-10-26')).toBe('Oct 26 – Nov 1')
  })

  it('gives the day of the month for each weekday', () => {
    expect(dayOfMonth('2026-10-26', 0)).toBe(26)
    expect(dayOfMonth('2026-10-26', 6)).toBe(1)
  })
})

describe('dueLabel', () => {
  const thursday = day(2026, 10, 22)

  it('says overdue once the date has passed', () => {
    expect(dueLabel('2026-10-21', '2026-10-19', thursday)).toEqual({ text: 'overdue', tone: 'overdue' })
  })

  it('names the weekday within the week being planned, and the date beyond it', () => {
    expect(dueLabel('2026-10-23', '2026-10-19', thursday)).toEqual({ text: 'due Fri', tone: 'soon' })
    expect(dueLabel('2026-10-30', '2026-10-19', thursday)).toEqual({ text: 'due Oct 30', tone: 'later' })
  })

  it('reads from the day a task sits on', () => {
    expect(dueLabel('2026-10-23', '2026-10-19', thursday, '2026-10-23')).toEqual({ text: 'due', tone: 'soon' })
    expect(dueLabel('2026-10-23', '2026-10-19', thursday, '2026-10-24')).toEqual({ text: 'overdue', tone: 'overdue' })
  })
})
