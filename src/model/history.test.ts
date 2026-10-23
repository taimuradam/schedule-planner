import { describe, expect, it } from 'vitest'
import { habitStreaks, pastWeeks, summarizeWeek } from './history'
import { createInitialState, plannerReducer, type Action } from './planner'
import type { HabitLog, PlannerState } from './types'

const actions: Action[] = [
  { type: 'daily/add', id: 'gym', text: 'Gym', category: 'personal' },
  { type: 'daily/update', id: 'gym', patch: { days: [0, 2, 4] } },
  { type: 'task/add', id: 'a', day: 0, text: 'Apply', category: 'job' },
  { type: 'task/add', id: 'b', day: 1, text: 'PS5', category: 'school' },
]
const gym = (done: number[]): HabitLog[] => [
  { id: 'gym', text: 'Gym', category: 'personal', days: [0, 2, 4], done: done as HabitLog['done'] },
]

function reviewed(...weeks: { done: string[]; habits?: HabitLog[] }[]): PlannerState {
  let state = actions.reduce(plannerReducer, createInitialState(new Date(2026, 9, 7)))
  weeks.forEach((w, i) => {
    const next = `2026-10-${12 + 7 * i}`
    state = plannerReducer(state, { type: 'week/review', doneIds: w.done, nextStart: next, habits: w.habits })
  })
  return state
}

describe('summarizeWeek', () => {
  it('counts tasks, categories and habits', () => {
    const [week] = pastWeeks(reviewed({ done: ['a'], habits: gym([0, 4]) }))
    const summary = summarizeWeek(week)
    expect(summary.tasks).toEqual({ done: 1, total: 2 })
    expect(summary.byCategory.job).toEqual({ done: 1, total: 1 })
    expect(summary.byCategory.school).toEqual({ done: 0, total: 1 })
    expect(summary.habits).toEqual({ done: 2, total: 3 })
  })

  it('leaves habits out when they were not ticked off', () => {
    const [week] = pastWeeks(reviewed({ done: [] }))
    expect(summarizeWeek(week).habits).toBeUndefined()
  })
})

describe('habitStreaks', () => {
  it('counts scheduled days done in a row across weeks, newest first', () => {
    const state = reviewed({ done: [], habits: gym([2, 4]) }, { done: [], habits: gym([0, 2, 4]) })
    expect(habitStreaks(state)).toMatchObject([{ id: 'gym', days: 5 }])
  })

  it('stops at a missed day or a week without ticks', () => {
    expect(habitStreaks(reviewed({ done: [], habits: gym([0, 2]) }))[0].days).toBe(0)
    expect(habitStreaks(reviewed({ done: [], habits: gym([0, 2, 4]) }, { done: [] }))[0].days).toBe(0)
  })
})
