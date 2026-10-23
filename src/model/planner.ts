import { CATEGORY_IDS } from './categories'
import { addDays, goalMonthOf, planningWeekStart, WEEKDAYS } from './dates'
import type {
  BacklogItem,
  CategoryId,
  DailyTask,
  DayTask,
  FocusItem,
  Goal,
  HabitLog,
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
  | { type: 'daily/update'; id: string; patch: Edit<DailyTask, 'text' | 'category' | 'active' | 'days'> }
  | { type: 'daily/remove'; id: string }
  | { type: 'focus/add'; id: string; text: string; category: CategoryId }
  | { type: 'focus/update'; id: string; patch: Edit<FocusItem, 'text' | 'category' | 'done'> }
  | { type: 'focus/remove'; id: string }
  | { type: 'backlog/add'; id: string; text: string; category: CategoryId }
  | { type: 'backlog/update'; id: string; patch: Edit<BacklogItem, 'text' | 'category' | 'due'> }
  | { type: 'backlog/remove'; id: string }
  // `beforeId` puts it at a spot you dropped it on (null: end of the day);
  // without it, it joins its category on that day.
  | { type: 'backlog/schedule'; id: string; day: Weekday; beforeId?: string | null }
  | { type: 'task/add'; id: string; day: Weekday; text: string; category: CategoryId }
  | { type: 'task/update'; id: string; patch: Edit<DayTask, 'text' | 'category' | 'done' | 'due'> }
  | { type: 'task/remove'; id: string }
  | { type: 'task/move'; id: string; day: Weekday }
  | { type: 'task/place'; id: string; day: Weekday; beforeId: string | null }
  | { type: 'task/unschedule'; id: string }
  | { type: 'task/addDay'; id: string; day: Weekday; newId: string }
  | { type: 'task/removeDay'; id: string }
  | { type: 'task/removeGroup'; id: string }
  | { type: 'task/repeat'; id: string; repeatingId: string }
  | { type: 'task/stopRepeat'; id: string }
  | { type: 'week/review'; doneIds: string[]; nextStart: string; habits?: HabitLog[] }
  | { type: 'backup/saved'; at: string }
  | { type: 'state/replace'; state: PlannerState }

/** The week's top priorities: three at most, or they stop being priorities. */
export const FOCUS_LIMIT = 3

export function newId(): string {
  return crypto.randomUUID()
}

export function createWeek(start: string, repeating: RepeatingTask[]): Week {
  const tasks = repeating
    .flatMap((r) => r.weekdays.map((day) => taskFromRepeating(start, r, day)))
    .sort((a, b) => a.day - b.day || rank(a.category) - rank(b.category))
  return { start, tasks, reviewed: false, focus: [] }
}

function taskFromRepeating(weekStart: string, r: RepeatingTask, day: Weekday): DayTask {
  return {
    id: `${weekStart}:${r.id}:${day}`,
    day,
    text: r.text,
    category: r.category,
    done: false,
    carriedOver: false,
    repeatingId: r.id,
    groupId: `${weekStart}:${r.id}`,
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

// A day's tasks are kept in the order they print: grouped by category
// (job, side, homework, personal) unless you've dragged some into place.
const rank = (category: CategoryId) => CATEGORY_IDS.indexOf(category)

/** Adds a task to its day just after the last task of the same or an earlier category. */
function insertByCategory(tasks: DayTask[], task: DayTask): DayTask[] {
  const sameDay = tasks.flatMap((t, i) => (t.day === task.day ? [{ t, i }] : []))
  if (sameDay.length === 0) return [...tasks, task]
  const after = sameDay.filter(({ t }) => rank(t.category) <= rank(task.category)).at(-1)
  const at = after ? after.i + 1 : sameDay[0].i
  return [...tasks.slice(0, at), task, ...tasks.slice(at)]
}

/** Puts a task right before another one, or at the end of its day when `beforeId` is null. */
function insertBefore(tasks: DayTask[], task: DayTask, beforeId: string | null): DayTask[] {
  const at = beforeId === null ? -1 : tasks.findIndex((t) => t.id === beforeId)
  if (at >= 0) return [...tasks.slice(0, at), task, ...tasks.slice(at)]
  const lastOfDay = tasks.findLastIndex((t) => t.day === task.day)
  return lastOfDay < 0 ? [...tasks, task] : [...tasks.slice(0, lastOfDay + 1), task, ...tasks.slice(lastOfDay + 1)]
}

/** Moves the given tasks back to their category's spot, skipping ones placed by hand. */
function regroup(tasks: DayTask[], ids: Set<string>): DayTask[] {
  let result = tasks
  for (const id of ids) {
    const task = result.find((t) => t.id === id)
    if (!task || task.placed) continue
    result = insertByCategory(
      result.filter((t) => t.id !== id),
      task,
    )
  }
  return result
}

/** Sorts each day by category, leaving alone any day where something was placed by hand. */
export function groupByCategory(week: Week): Week {
  const tasks = [...week.tasks]
  for (const day of WEEKDAYS) {
    const slots = tasks.flatMap((t, i) => (t.day === day ? [i] : []))
    const dayTasks = slots.map((i) => tasks[i])
    if (dayTasks.some((t) => t.placed)) continue
    const sorted = [...dayTasks].sort((a, b) => rank(a.category) - rank(b.category))
    slots.forEach((slot, i) => (tasks[slot] = sorted[i]))
  }
  return { ...week, tasks }
}

/** Every copy of a task in the week, one per day it's on. */
export function groupOf(week: Week, task: DayTask): DayTask[] {
  return task.groupId ? week.tasks.filter((t) => t.groupId === task.groupId) : [task]
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

const sortedDays = (days: Weekday[]) => [...new Set(days)].sort((a, b) => a - b)

/**
 * Changes which weekdays a repeating task comes back on. With no days left
 * it stops repeating, and this week's copies are kept as one-offs.
 */
function withRuleDays(state: PlannerState, ruleId: string, fn: (days: Weekday[]) => Weekday[]): PlannerState {
  const rule = state.repeating.find((r) => r.id === ruleId)
  if (!rule) return state
  const weekdays = sortedDays(fn(rule.weekdays))
  if (weekdays.length > 0) return { ...state, repeating: patchById(state.repeating, ruleId, { weekdays }) }
  const next = withWeek(state, (w) => ({
    ...w,
    tasks: w.tasks.map((t) => (t.repeatingId === ruleId ? { ...t, repeatingId: undefined } : t)),
  }))
  return { ...next, repeating: next.repeating.filter((r) => r.id !== ruleId) }
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
      const task: DailyTask = { id, text: text.trim(), category, active: true, days: [...WEEKDAYS] }
      return { ...state, dailyTasks: [...state.dailyTasks, task] }
    }
    case 'daily/update': {
      const patch = trimmed(action.patch)
      const days = patch.days && sortedDays(patch.days)
      // A habit always keeps at least one day; hide it from the page instead.
      if (days?.length === 0) return state
      return { ...state, dailyTasks: patchById(state.dailyTasks, action.id, days ? { ...patch, days } : patch) }
    }
    case 'daily/remove':
      return { ...state, dailyTasks: state.dailyTasks.filter((t) => t.id !== action.id) }

    case 'focus/add': {
      const { id, text, category } = action
      if (currentWeek(state).focus.length >= FOCUS_LIMIT) return state
      const item: FocusItem = { id, text: text.trim(), category, done: false }
      return withWeek(state, (w) => ({ ...w, focus: [...w.focus, item] }))
    }
    case 'focus/update':
      return withWeek(state, (w) => ({ ...w, focus: patchById(w.focus, action.id, trimmed(action.patch)) }))
    case 'focus/remove':
      return withWeek(state, (w) => ({ ...w, focus: w.focus.filter((f) => f.id !== action.id) }))

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
        ...(item.due && { due: item.due }),
      }
      const next = { ...state, backlog: state.backlog.filter((b) => b.id !== item.id) }
      if (action.beforeId === undefined)
        return withWeek(next, (w) => ({ ...w, tasks: insertByCategory(w.tasks, task) }))
      const beforeId = action.beforeId
      return withWeek(next, (w) => ({ ...w, tasks: insertBefore(w.tasks, { ...task, placed: true }, beforeId) }))
    }

    case 'task/add': {
      const { id, day, text, category } = action
      const task: DayTask = { id, day, text: text.trim(), category, done: false, carriedOver: false }
      return withWeek(state, (w) => ({ ...w, tasks: insertByCategory(w.tasks, task) }))
    }
    case 'task/update': {
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task) return state
      // A rename or new category applies to the task on every day it's on;
      // done-ness belongs to each day's copy alone.
      const { done, ...shared } = trimmed(action.patch)
      const groupIds = new Set(groupOf(currentWeek(state), task).map((t) => t.id))
      let next = withWeek(state, (w) => ({
        ...w,
        tasks: w.tasks.map((t) =>
          t.id === task.id
            ? { ...t, ...shared, ...(done !== undefined && { done }) }
            : groupIds.has(t.id)
              ? { ...t, ...shared }
              : t,
        ),
      }))
      // A new category moves it to that category's spot, unless it was placed by hand.
      if (shared.category !== undefined && shared.category !== task.category) {
        next = withWeek(next, (w) => ({ ...w, tasks: regroup(w.tasks, groupIds) }))
      }
      // Renaming or recategorising a weekly task changes it for future weeks too.
      const { text, category } = shared
      if (!task.repeatingId || (text === undefined && category === undefined)) return next
      const rulePatch = { ...(text !== undefined && { text }), ...(category !== undefined && { category }) }
      return { ...next, repeating: patchById(next.repeating, task.repeatingId, rulePatch) }
    }
    case 'task/remove':
      return withWeek(state, (w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== action.id) }))
    case 'task/move': {
      // Dropped on a day as a whole: it joins its category there. If the task
      // is already on that day too, the two simply merge.
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task || task.day === action.day) return state
      const alreadyThere = groupOf(currentWeek(state), task).some((t) => t.day === action.day)
      return withWeek(state, (w) => {
        const rest = w.tasks.filter((t) => t.id !== task.id)
        return {
          ...w,
          tasks: alreadyThere ? rest : insertByCategory(rest, { ...task, day: action.day, placed: false }),
        }
      })
    }
    case 'task/place': {
      // Dropped at a particular spot: it stays exactly there from now on.
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task || task.id === action.beforeId) return state
      const alreadyThere =
        task.day !== action.day && groupOf(currentWeek(state), task).some((t) => t.day === action.day)
      return withWeek(state, (w) => {
        const rest = w.tasks.filter((t) => t.id !== task.id)
        if (alreadyThere) return { ...w, tasks: rest }
        return { ...w, tasks: insertBefore(rest, { ...task, day: action.day, placed: true }, action.beforeId) }
      })
    }
    case 'task/unschedule': {
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task) return state
      const { id, text, category, carriedOver, due } = task
      const item: BacklogItem = { id, text, category, carriedOver, ...(due && { due }) }
      const next = withWeek(state, (w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== task.id) }))
      return { ...next, backlog: [item, ...next.backlog] }
    }

    case 'task/addDay': {
      // Puts the same task on another day as well, linked to the original.
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task || groupOf(currentWeek(state), task).some((t) => t.day === action.day)) return state
      const groupId = task.groupId ?? task.id
      const copy: DayTask = { ...task, id: action.newId, day: action.day, done: false, groupId, placed: false }
      const next = withWeek(state, (w) => ({
        ...w,
        tasks: insertByCategory(
          w.tasks.map((t) => (t.id === task.id ? { ...t, groupId } : t)),
          copy,
        ),
      }))
      return task.repeatingId ? withRuleDays(next, task.repeatingId, (days) => [...days, action.day]) : next
    }
    case 'task/removeDay': {
      // Takes the task off one day; a weekly task stops coming back on that day.
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task) return state
      const next = withWeek(state, (w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== task.id) }))
      return task.repeatingId
        ? withRuleDays(next, task.repeatingId, (days) => days.filter((d) => d !== task.day))
        : next
    }
    case 'task/removeGroup': {
      // Removes the task from every day this week. Weekly tasks still come back.
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task) return state
      const ids = new Set(groupOf(currentWeek(state), task).map((t) => t.id))
      return withWeek(state, (w) => ({ ...w, tasks: w.tasks.filter((t) => !ids.has(t.id)) }))
    }

    case 'task/repeat': {
      // Repeats on every day the task is on now, from next week onwards.
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task || task.repeatingId) return state
      const group = groupOf(currentWeek(state), task)
      const rule: RepeatingTask = {
        id: action.repeatingId,
        weekdays: sortedDays(group.map((t) => t.day)),
        text: task.text,
        category: task.category,
      }
      const ids = new Set(group.map((t) => t.id))
      const next = withWeek(state, (w) => ({
        ...w,
        tasks: w.tasks.map((t) => (ids.has(t.id) ? { ...t, repeatingId: rule.id } : t)),
      }))
      return { ...next, repeating: [...next.repeating, rule] }
    }
    case 'task/stopRepeat': {
      // This week's copy stays; it just stops coming back.
      const task = currentWeek(state).tasks.find((t) => t.id === action.id)
      if (!task?.repeatingId) return state
      const ruleId = task.repeatingId
      const next = withWeek(state, (w) => ({
        ...w,
        tasks: w.tasks.map((t) => (t.repeatingId === ruleId ? { ...t, repeatingId: undefined } : t)),
      }))
      return { ...next, repeating: next.repeating.filter((r) => r.id !== ruleId) }
    }

    case 'week/review':
      return reviewWeek(state, action.doneIds, action.nextStart, action.habits)

    case 'backup/saved':
      return { ...state, lastBackupAt: action.at }

    case 'state/replace':
      return action.state
  }
}

/**
 * Closes the current week: records what got crossed off, sends everything
 * unfinished to the top of the backlog, and opens the next week with the
 * repeating tasks filled in.
 */
function reviewWeek(state: PlannerState, doneIds: string[], nextStart: string, habits?: HabitLog[]): PlannerState {
  const week = currentWeek(state)
  const done = new Set(doneIds)
  const tasks = week.tasks.map((t) => ({ ...t, done: done.has(t.id) }))
  const focus = week.focus.map((f) => ({ ...f, done: done.has(f.id) }))

  // Repeating tasks come back next week on their own, so they don't roll over.
  // A task on several days rolls over once, not once per day.
  const backlogIds = new Set(state.backlog.map((b) => b.id))
  const rolledGroups = new Set<string>()
  const rolled: BacklogItem[] = tasks
    .filter((t) => !t.done && !t.repeatingId && !backlogIds.has(t.id))
    .filter((t) => {
      if (!t.groupId) return true
      if (rolledGroups.has(t.groupId)) return false
      rolledGroups.add(t.groupId)
      return true
    })
    .map((t) => ({ id: t.id, text: t.text, category: t.category, carriedOver: true, ...(t.due && { due: t.due }) }))

  const start = nextStart > week.start ? nextStart : addDays(week.start, 7)
  const nextWeek = state.weeks[start] ?? createWeek(start, state.repeating)

  return {
    ...state,
    backlog: [...rolled, ...state.backlog],
    weeks: { ...state.weeks, [week.start]: { ...week, tasks, focus, reviewed: true, ...(habits && { habits }) }, [start]: nextWeek },
    currentWeek: start,
  }
}
