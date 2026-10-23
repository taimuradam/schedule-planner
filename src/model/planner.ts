import { addDays, goalMonthOf, planningWeekStart } from './dates'
import type {
  BacklogItem,
  CategoryId,
  DailyTask,
  DayTask,
  Goal,
  PlannerState,
  RepeatingTask,
  Week,
  Weekday,
} from './types'

type Edit<T, K extends keyof T> = Partial<Pick<T, K>>

// Ids are created by the caller and carried on the action, so the reducer
// stays pure. Ids the reducer has to derive itself are built from existing ids.
export type Action =
  | { type: 'goal/add'; id: string; month: string; text: string; category: CategoryId }
  | { type: 'goal/update'; id: string; patch: Edit<Goal, 'text' | 'category'> }
  | { type: 'goal/remove'; id: string }
  | { type: 'goal/copyMonth'; from: string; to: string }
  | { type: 'daily/add'; id: string; text: string; category: CategoryId }
  | { type: 'daily/update'; id: string; patch: Edit<DailyTask, 'text' | 'category' | 'active'> }
  | { type: 'daily/remove'; id: string }
  | { type: 'repeating/add'; id: string; weekday: Weekday; text: string; category: CategoryId }
  | { type: 'repeating/update'; id: string; patch: Edit<RepeatingTask, 'text' | 'category' | 'weekday'> }
  | { type: 'repeating/remove'; id: string }
  | { type: 'backlog/add'; id: string; text: string; category: CategoryId }
  | { type: 'backlog/update'; id: string; patch: Edit<BacklogItem, 'text' | 'category'> }
  | { type: 'backlog/remove'; id: string }
  | { type: 'backlog/schedule'; id: string; day: Weekday }
  | { type: 'task/add'; id: string; day: Weekday; text: string; category: CategoryId }
  | { type: 'task/update'; id: string; patch: Edit<DayTask, 'text' | 'category' | 'done'> }
  | { type: 'task/remove'; id: string }
  | { type: 'task/move'; id: string; day: Weekday }
  | { type: 'task/unschedule'; id: string }
  | { type: 'week/review'; doneIds: string[]; nextStart: string }
  | { type: 'state/replace'; state: PlannerState }

export function newId(): string {
  return crypto.randomUUID()
}

export function createWeek(start: string, repeating: RepeatingTask[]): Week {
  const tasks = [...repeating]
    .sort((a, b) => a.weekday - b.weekday)
    .map((r) => taskFromRepeating(start, r))
  return { start, tasks, reviewed: false }
}

function taskFromRepeating(weekStart: string, r: RepeatingTask): DayTask {
  return {
    id: `${weekStart}:${r.id}`,
    day: r.weekday,
    text: r.text,
    category: r.category,
    done: false,
    carriedOver: false,
    repeatingId: r.id,
  }
}

export function createInitialState(today: Date): PlannerState {
  const start = planningWeekStart(today)
  return {
    version: 1,
    goals: [],
    dailyTasks: [],
    repeating: [],
    backlog: [],
    weeks: { [start]: createWeek(start, []) },
    currentWeek: start,
  }
}

export function currentWeek(state: PlannerState): Week {
  return state.weeks[state.currentWeek]
}

export function goalsForMonth(state: PlannerState, month: string): Goal[] {
  return state.goals.filter((g) => g.month === month)
}

export function currentGoals(state: PlannerState): Goal[] {
  return goalsForMonth(state, goalMonthOf(state.currentWeek))
}

function withWeek(state: PlannerState, fn: (week: Week) => Week): PlannerState {
  const week = currentWeek(state)
  return { ...state, weeks: { ...state.weeks, [week.start]: fn(week) } }
}

function patchById<T extends { id: string }>(items: T[], id: string, patch: Partial<NoInfer<T>>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

function trimmed<T extends { text?: string }>(patch: T): T {
  return patch.text === undefined ? patch : { ...patch, text: patch.text.trim() }
}

export function plannerReducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case 'goal/add': {
      const { id, month, text, category } = action
      return { ...state, goals: [...state.goals, { id, month, text: text.trim(), category }] }
    }
    case 'goal/update':
      return { ...state, goals: patchById(state.goals, action.id, trimmed(action.patch)) }
    case 'goal/remove':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) }
    case 'goal/copyMonth': {
      const copies = goalsForMonth(state, action.from).map((g) => ({
        ...g,
        id: `${g.id}@${action.to}`,
        month: action.to,
      }))
      return { ...state, goals: [...state.goals, ...copies] }
    }

    case 'daily/add': {
      const { id, text, category } = action
      return { ...state, dailyTasks: [...state.dailyTasks, { id, text: text.trim(), category, active: true }] }
    }
    case 'daily/update':
      return { ...state, dailyTasks: patchById(state.dailyTasks, action.id, trimmed(action.patch)) }
    case 'daily/remove':
      return { ...state, dailyTasks: state.dailyTasks.filter((t) => t.id !== action.id) }

    case 'repeating/add': {
      const { id, weekday, text, category } = action
      const repeating: RepeatingTask = { id, weekday, text: text.trim(), category }
      const next = { ...state, repeating: [...state.repeating, repeating] }
      // Show it in the week being planned too, not just from next week on.
      if (currentWeek(state).reviewed) return next
      return withWeek(next, (w) => ({ ...w, tasks: [...w.tasks, taskFromRepeating(w.start, repeating)] }))
    }
    // Changes to a repeating task also apply to its copy in the week being
    // planned, the same way adding one does. Reviewed weeks are left alone.
    case 'repeating/update': {
      const { weekday, ...rest } = trimmed(action.patch)
      const next = { ...state, repeating: patchById(state.repeating, action.id, trimmed(action.patch)) }
      if (currentWeek(state).reviewed) return next
      const taskPatch: Partial<DayTask> = weekday === undefined ? rest : { ...rest, day: weekday }
      return withWeek(next, (w) => ({
        ...w,
        tasks: w.tasks.map((t) => (t.repeatingId === action.id ? { ...t, ...taskPatch } : t)),
      }))
    }
    case 'repeating/remove': {
      const next = { ...state, repeating: state.repeating.filter((r) => r.id !== action.id) }
      if (currentWeek(state).reviewed) return next
      return withWeek(next, (w) => ({ ...w, tasks: w.tasks.filter((t) => t.repeatingId !== action.id) }))
    }

    case 'backlog/add': {
      const { id, text, category } = action
      return { ...state, backlog: [...state.backlog, { id, text: text.trim(), category, carriedOver: false }] }
    }
    case 'backlog/update':
      return { ...state, backlog: patchById(state.backlog, action.id, trimmed(action.patch)) }
    case 'backlog/remove':
      return { ...state, backlog: state.backlog.filter((b) => b.id !== action.id) }
    case 'backlog/schedule': {
      const item = state.backlog.find((b) => b.id === action.id)
      if (!item) return state
      const task: DayTask = {
        id: item.id,
        day: action.day,
        text: item.text,
        category: item.category,
        done: false,
        carriedOver: item.carriedOver,
      }
      const next = { ...state, backlog: state.backlog.filter((b) => b.id !== item.id) }
      return withWeek(next, (w) => ({ ...w, tasks: [...w.tasks, task] }))
    }

    case 'task/add': {
      const { id, day, text, category } = action
      const task: DayTask = { id, day, text: text.trim(), category, done: false, carriedOver: false }
      return withWeek(state, (w) => ({ ...w, tasks: [...w.tasks, task] }))
    }
    case 'task/update':
      return withWeek(state, (w) => ({ ...w, tasks: patchById(w.tasks, action.id, trimmed(action.patch)) }))
    case 'task/remove':
      return withWeek(state, (w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== action.id) }))
    case 'task/move': {
      // Moving to another day puts the task at the bottom of that day's list.
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task || task.day === action.day) return state
      return withWeek(state, (w) => ({
        ...w,
        tasks: [...w.tasks.filter((t) => t.id !== task.id), { ...task, day: action.day }],
      }))
    }
    case 'task/unschedule': {
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task) return state
      const item: BacklogItem = { id: task.id, text: task.text, category: task.category, carriedOver: task.carriedOver }
      const next = withWeek(state, (w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== task.id) }))
      return { ...next, backlog: [item, ...next.backlog] }
    }

    case 'week/review':
      return reviewWeek(state, action.doneIds, action.nextStart)

    case 'state/replace':
      return action.state
  }
}

/**
 * Closes the current week: records what got crossed off, sends everything
 * unfinished to the top of the backlog, and opens the next week with the
 * repeating tasks filled in.
 */
function reviewWeek(state: PlannerState, doneIds: string[], nextStart: string): PlannerState {
  const week = currentWeek(state)
  const done = new Set(doneIds)
  const tasks = week.tasks.map((t) => ({ ...t, done: done.has(t.id) }))

  // Repeating tasks come back next week on their own, so they don't roll over.
  const backlogIds = new Set(state.backlog.map((b) => b.id))
  const rolled: BacklogItem[] = tasks
    .filter((t) => !t.done && !t.repeatingId && !backlogIds.has(t.id))
    .map((t) => ({ id: t.id, text: t.text, category: t.category, carriedOver: true }))

  const start = nextStart > week.start ? nextStart : addDays(week.start, 7)
  const nextWeek = state.weeks[start] ?? createWeek(start, state.repeating)

  return {
    ...state,
    backlog: [...rolled, ...state.backlog],
    weeks: { ...state.weeks, [week.start]: { ...week, tasks, reviewed: true }, [start]: nextWeek },
    currentWeek: start,
  }
}
