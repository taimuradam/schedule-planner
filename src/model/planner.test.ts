import { describe, expect, it } from 'vitest'
import { createInitialState, currentGoals, currentWeek, plannerReducer, type Action } from './planner'
import type { PlannerState } from './types'

const WEEK = '2026-10-19'

function run(actions: Action[], state = createInitialState(new Date(2026, 9, 21))): PlannerState {
  return actions.reduce(plannerReducer, state)
}

const tasksOn = (state: PlannerState, day: number) =>
  currentWeek(state)
    .tasks.filter((t) => t.day === day)
    .map((t) => t.text)

describe('initial state', () => {
  it('opens on the week being planned', () => {
    const state = createInitialState(new Date(2026, 9, 21))
    expect(state.currentWeek).toBe(WEEK)
    expect(currentWeek(state).tasks).toEqual([])
  })
})

describe('day tasks and the backlog', () => {
  it('adds tasks to a day with trimmed text', () => {
    const state = run([{ type: 'task/add', id: 't1', day: 2, text: '  Mock interview ', category: 'job' }])
    expect(tasksOn(state, 2)).toEqual(['Mock interview'])
  })

  it('moves a task to the bottom of another day', () => {
    const state = run([
      { type: 'task/add', id: 't1', day: 0, text: 'A', category: 'job' },
      { type: 'task/add', id: 't2', day: 1, text: 'B', category: 'job' },
      { type: 'task/move', id: 't1', day: 1 },
    ])
    expect(tasksOn(state, 0)).toEqual([])
    expect(tasksOn(state, 1)).toEqual(['B', 'A'])
  })

  it('schedules a backlog item onto a day, keeping its carried-over mark', () => {
    let state = run([{ type: 'backlog/add', id: 'b1', text: 'Update LinkedIn', category: 'job' }])
    state = { ...state, backlog: state.backlog.map((b) => ({ ...b, carriedOver: true })) }
    state = plannerReducer(state, { type: 'backlog/schedule', id: 'b1', day: 3 })
    expect(state.backlog).toEqual([])
    expect(currentWeek(state).tasks).toMatchObject([{ id: 'b1', day: 3, text: 'Update LinkedIn', carriedOver: true }])
  })

  it('sends a task back to the top of the backlog', () => {
    const state = run([
      { type: 'backlog/add', id: 'b1', text: 'Older', category: 'side' },
      { type: 'task/add', id: 't1', day: 4, text: 'Deploy MVP', category: 'side' },
      { type: 'task/unschedule', id: 't1' },
    ])
    expect(currentWeek(state).tasks).toEqual([])
    expect(state.backlog.map((b) => b.text)).toEqual(['Deploy MVP', 'Older'])
  })
})

describe('repeating tasks', () => {
  const repeating = () =>
    run([
      { type: 'task/add', id: 't1', day: 3, text: 'PS due', category: 'school' },
      { type: 'task/repeat', id: 't1', repeatingId: 'r1' },
    ])

  it('turns a task into a weekly rule on its current weekday', () => {
    const state = repeating()
    expect(state.repeating).toEqual([{ id: 'r1', weekday: 3, text: 'PS due', category: 'school' }])
    expect(currentWeek(state).tasks).toMatchObject([{ id: 't1', repeatingId: 'r1' }])
  })

  it('carries renames and category changes through to the rule', () => {
    const state = plannerReducer(repeating(), {
      type: 'task/update',
      id: 't1',
      patch: { text: 'Problem set due', category: 'job' },
    })
    expect(state.repeating).toMatchObject([{ text: 'Problem set due', category: 'job', weekday: 3 }])
  })

  it('stops repeating without removing this week’s copy', () => {
    const state = plannerReducer(repeating(), { type: 'task/stopRepeat', id: 't1' })
    expect(state.repeating).toEqual([])
    expect(currentWeek(state).tasks).toMatchObject([{ id: 't1', text: 'PS due', repeatingId: undefined }])
  })
})

describe('weekly review', () => {
  const planned = () =>
    run([
      { type: 'task/add', id: 'ps', day: 3, text: 'PS due', category: 'school' },
      { type: 'task/repeat', id: 'ps', repeatingId: 'r1' },
      { type: 'task/add', id: 'done', day: 0, text: 'Tailor resume', category: 'job' },
      { type: 'task/add', id: 'open', day: 1, text: 'Coffee chat', category: 'job' },
      { type: 'backlog/add', id: 'b1', text: 'Already waiting', category: 'job' },
    ])

  it('records what was done and opens the next week with repeating tasks', () => {
    const state = plannerReducer(planned(), { type: 'week/review', doneIds: ['done'], nextStart: '2026-10-26' })
    const old = state.weeks[WEEK]
    expect(old.reviewed).toBe(true)
    expect(old.tasks.find((t) => t.id === 'done')?.done).toBe(true)
    expect(old.tasks.find((t) => t.id === 'open')?.done).toBe(false)

    expect(state.currentWeek).toBe('2026-10-26')
    expect(currentWeek(state).tasks).toMatchObject([{ day: 3, text: 'PS due', repeatingId: 'r1' }])
  })

  it('rolls unfinished one-off tasks to the top of the backlog, but not repeating ones', () => {
    const state = plannerReducer(planned(), { type: 'week/review', doneIds: ['done'], nextStart: '2026-10-26' })
    expect(state.backlog.map((b) => [b.text, b.carriedOver])).toEqual([
      ['Coffee chat', true],
      ['Already waiting', false],
    ])
  })

  it('never goes backwards, even if asked to', () => {
    const state = plannerReducer(planned(), { type: 'week/review', doneIds: [], nextStart: '2026-10-12' })
    expect(state.currentWeek).toBe('2026-10-26')
  })

  it('jumps ahead when weeks were skipped', () => {
    const state = plannerReducer(planned(), { type: 'week/review', doneIds: [], nextStart: '2026-11-09' })
    expect(state.currentWeek).toBe('2026-11-09')
  })
})

describe('monthly goals', () => {
  it('shows goals for the month holding the week’s Thursday', () => {
    const state = run([
      { type: 'goal/add', id: 'g1', month: '2026-10', text: 'October goal', category: 'job' },
      { type: 'goal/add', id: 'g2', month: '2026-11', text: 'November goal', category: 'job' },
    ])
    expect(currentGoals(state).map((g) => g.text)).toEqual(['October goal'])
  })

  it('copies last month’s goals into a new month', () => {
    const state = run([
      { type: 'goal/add', id: 'g1', month: '2026-10', text: 'Ship v1', category: 'side' },
      { type: 'goal/copyMonth', from: '2026-10', to: '2026-11' },
    ])
    const november = state.goals.filter((g) => g.month === '2026-11')
    expect(november).toMatchObject([{ text: 'Ship v1', category: 'side' }])
    expect(november[0].id).not.toBe('g1')
  })
})
