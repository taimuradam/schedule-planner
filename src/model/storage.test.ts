import { describe, expect, it } from 'vitest'
import { createInitialState, plannerReducer, type Action } from './planner'
import { parseState } from './storage'

describe('parseState', () => {
  const actions: Action[] = [
    { type: 'goal/add', id: 'g1', month: '2026-10', text: 'Ship v1', category: 'side' },
    { type: 'daily/add', id: 'd1', text: 'Apply to 3 jobs', category: 'job' },
    { type: 'task/add', id: 't1', day: 2, text: 'Mock interview', category: 'job' },
  ]
  const valid = () => actions.reduce(plannerReducer, createInitialState(new Date(2026, 9, 21)))

  it('accepts a round-tripped backup', () => {
    const state = valid()
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('reads repeating tasks saved with a single weekday', () => {
    const old = { ...valid(), repeating: [{ id: 'r1', weekday: 3, text: 'PS due', category: 'school' }] }
    expect(parseState(old)?.repeating).toEqual([{ id: 'r1', weekdays: [3], text: 'PS due', category: 'school' }])
  })

  it('rejects things that are not planner data', () => {
    expect(parseState(null)).toBeNull()
    expect(parseState([])).toBeNull()
    expect(parseState({ hello: 'world' })).toBeNull()
    expect(parseState({ ...valid(), version: 2 })).toBeNull()
  })

  it('rejects data with broken items', () => {
    const state = valid()
    expect(parseState({ ...state, goals: [{ id: 'x', text: 'No month', category: 'job' }] })).toBeNull()
    expect(
      parseState({ ...state, dailyTasks: [{ id: 'x', text: 'Bad', category: 'chores', active: true }] }),
    ).toBeNull()
    expect(parseState({ ...state, currentWeek: '2030-01-07' })).toBeNull()
  })
})
