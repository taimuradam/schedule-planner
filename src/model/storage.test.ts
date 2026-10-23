import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialState, plannerReducer, type Action } from './planner'
import { loadState, parseState, saveState } from './storage'

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

  it('reads daily tasks saved before they had days as every day', () => {
    const old = { ...valid(), dailyTasks: [{ id: 'd1', text: 'Gym', category: 'personal', active: true }] }
    expect(parseState(old)?.dailyTasks[0].days).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('drops the old Top 3 list from weeks saved while it existed', () => {
    const state = valid()
    const week = state.weeks[state.currentWeek]
    const saved = {
      ...state,
      weeks: { [state.currentWeek]: { ...week, focus: [{ id: 'f', text: 'Ship', category: 'side', done: false }] } },
    }
    expect(parseState(saved)?.weeks[state.currentWeek]).toEqual(week)
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

describe('loadState', () => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
  afterEach(() => store.clear())

  it('reads back what was saved', () => {
    const state = createInitialState(new Date(2026, 9, 21))
    saveState(state)
    expect(loadState()).toEqual({ state, unreadable: null })
  })

  it('keeps data it cannot read instead of letting it be overwritten', () => {
    store.set('weekly-planner:v1', '{"version": 1, "goals": "oops"}')
    const loaded = loadState()
    expect(loaded.state).toBeNull()
    expect(loaded.unreadable).toBe('{"version": 1, "goals": "oops"}')
    const kept = [...store.entries()].find(([k]) => k.startsWith('weekly-planner:v1:unreadable:'))
    expect(kept?.[1]).toBe('{"version": 1, "goals": "oops"}')
  })
})
