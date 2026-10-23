import { describe, expect, it } from 'vitest'
import { createInitialState, plannerReducer, type Action } from '../model/planner'
import { buildGuesser, examplesFrom } from './guessCategory'

describe('buildGuesser', () => {
  const starter = buildGuesser([])

  it('recognises starter keywords and phrases', () => {
    expect(starter('Tailor resume for Stripe')).toBe('job')
    expect(starter('Coffee chat with alum')).toBe('job')
    expect(starter('Deploy MVP')).toBe('side')
    expect(starter('PS4 Q1-3')).toBe('school')
    expect(starter('Study for the midterm')).toBe('school')
  })

  it('stays quiet when nothing points anywhere, or it is a toss-up', () => {
    expect(starter('Buy groceries')).toBeUndefined()
    expect(starter('')).toBeUndefined()
    expect(starter('Interview prep for the class project app')).toBeUndefined()
  })

  it('learns your own words, like course codes and project names', () => {
    const guess = buildGuesser([
      { text: 'CS 161 lecture notes', category: 'school' },
      { text: 'Planner app: print layout', category: 'side' },
    ])
    expect(guess('CS 161 problem set')).toBe('school')
    expect(guess('Planner backlog drawer')).toBe('side')
  })

  it('lets your history overrule a starter keyword', () => {
    const guess = buildGuesser([
      { text: 'Design review for the portfolio app', category: 'job' },
      { text: 'Portfolio app case study', category: 'job' },
    ])
    expect(guess('Portfolio app polish')).toBe('job')
  })
})

describe('examplesFrom', () => {
  it('collects every filed line once', () => {
    const actions: Action[] = [
      { type: 'goal/add', id: 'g', month: '2026-10', text: 'Ship v1', category: 'side' },
      { type: 'task/add', id: 'a', day: 0, text: 'Gym', category: 'side' },
      { type: 'task/addDay', id: 'a', day: 2, newId: 'b' },
      { type: 'backlog/add', id: 'c', text: 'Read chapter 7', category: 'school' },
    ]
    const state = actions.reduce(plannerReducer, createInitialState(new Date(2026, 9, 21)))
    expect(examplesFrom(state).map((e) => e.text)).toEqual(['Ship v1', 'Read chapter 7', 'Gym'])
  })
})
